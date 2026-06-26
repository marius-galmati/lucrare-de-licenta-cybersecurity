import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShareService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createShareLink(assessmentId: string, userId: string) {
    // Verifică dreptul de proprietate
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    if (assessment.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    const token = uuidv4();
    await this.prisma.shareLink.create({
      data: { assessmentId, token },
    });

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    return { token, shareUrl: `${frontendUrl}/share/${token}` };
  }

  async getByToken(token: string) {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) throw new NotFoundException('Share link not found.');
    if (shareLink.revokedAt) {
      throw new ForbiddenException('This share link has been revoked.');
    }

    // Preia scorul
    const score = await this.prisma.score.findFirst({
      where: { assessmentId: shareLink.assessmentId },
      orderBy: { createdAt: 'desc' },
    });

    // Preia evaluarea
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: shareLink.assessmentId },
    });

    // Preia numele companiei
    let companyName: string | null = null;
    if (assessment?.userId) {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: assessment.userId },
      });
      companyName = profile?.companyName ?? null;
    }

    return { score, assessment, companyName };
  }
}
