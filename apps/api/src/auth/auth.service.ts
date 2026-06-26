import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../common/email/email.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  /** Curăță token-urile de resetare expirate la pornire și la fiecare oră */
  onModuleInit() {
    this.cleanupExpiredTokens();
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  // =========================================================================
  // ÎNREGISTRARE (deduplicarea companiei după numele normalizat)
  // =========================================================================

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('This email is already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const normalizedName = dto.companyName.trim().toLowerCase();

    const user = await this.prisma.$transaction(async (tx) => {
      // Verifică dacă există deja o companie cu același nume normalizat
      let company = await tx.company.findFirst({
        where: { normalizedName },
      });

      if (!company) {
        company = await tx.company.create({
          data: {
            name: dto.companyName.trim(),
            normalizedName,
            primaryEmail: email,
          },
        });
      }

      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          profile: {
            create: {
              email,
              companyName: dto.companyName.trim(),
              companyId: company.id,
            },
          },
        },
        include: { profile: true },
      });

      return newUser;
    });

    await this.autoProvisionSuperAdmin(user.id, email);

    // Trimite e-mailul de bun venit (asincron, fără a bloca înregistrarea)
    this.emailService
      .sendWelcome(email, dto.companyName.trim())
      .catch((err) => this.logger.error(`Failed to send welcome email: ${err.message}`));

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    };
  }

  // =========================================================================
  // AUTENTIFICARE
  // =========================================================================

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    };
  }

  // =========================================================================
  // REÎNNOIRE TOKEN
  // =========================================================================

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }

      const accessToken = this.generateAccessToken(user.id, user.email);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  // =========================================================================
  // RESETARE PAROLĂ UITATĂ (token-uri persistate în baza de date)
  // =========================================================================

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Returnează întotdeauna succes pentru a nu dezvălui existența e-mailului
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generează un token securizat criptografic
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    // Stochează token-ul hash-uit în baza de date
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 oră
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordReset(user.email, resetUrl);
  }

  // =========================================================================
  // RESETARE PAROLĂ (căutare în baza de date + tranzacție atomică)
  // =========================================================================

  async resetPassword(rawToken: string, newPassword: string) {
    // Găsește toate token-urile nefolosite și neexpirate
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limitează scanarea la token-urile recente
    });

    // Compară token-ul brut cu hash-urile stocate
    let matchedToken: (typeof candidates)[0] | null = null;
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(rawToken, candidate.tokenHash);
      if (isMatch) {
        matchedToken = candidate;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const user = await this.usersService.findById(matchedToken.userId);
    if (!user) {
      throw new BadRequestException('Invalid reset link.');
    }

    // Atomic: actualizează parola + marchează token-ul ca folosit
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: matchedToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for user: ${user.email}`);
  }

  // =========================================================================
  // UTILIZATOR CURENT
  // =========================================================================

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    await this.autoProvisionSuperAdmin(user.id, user.email);

    const isAdmin = await this.usersService.hasRole(user.id, 'super_admin');

    return {
      id: user.id,
      email: user.email,
      profile: user.profile,
      isAdmin,
    };
  }

  // =========================================================================
  // FUNCȚII AUXILIARE
  // =========================================================================

  private generateAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  private generateRefreshToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  private async generateTokens(userId: string, email: string) {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email),
    };
  }

  private async autoProvisionSuperAdmin(userId: string, email: string) {
    const allowlist = this.configService
      .get<string>('SUPER_ADMIN_EMAILS', '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowlist.includes(email.toLowerCase())) {
      await this.usersService.ensureRole(userId, 'super_admin');
      this.logger.log(`Auto-provisioned super_admin for: ${email}`);
    }
  }

  /** Șterge token-urile mai vechi de 24 de ore */
  private async cleanupExpiredTokens() {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { count } = await this.prisma.passwordResetToken.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired password reset tokens.`);
      }
    } catch (err) {
      this.logger.error('Failed to cleanup expired tokens:', err);
    }
  }

}
