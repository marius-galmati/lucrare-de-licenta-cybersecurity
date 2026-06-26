import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      termsAcceptedAt?: Date;
      termsVersion?: string;
      marketingConsent?: boolean;
    },
  ) {
    return this.prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: role as any,
        isActive: true,
      },
    });
    return !!userRole;
  }

  async ensureRole(userId: string, role: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_role: { userId, role: role as any } },
      update: { isActive: true },
      create: { userId, role: role as any, isActive: true },
    });
  }
}
