import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /** Nu aruncă niciodată excepții — un eșec la auditare nu trebuie să întrerupă operațiunile principale */
  async log(
    userId: string,
    actionType: string,
    entityType: string,
    entityId?: string,
    detailsJson?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          actionType,
          entityType,
          entityId: entityId ?? null,
          detailsJson: detailsJson ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create audit log: ${actionType}`, err);
    }
  }

  async findAll(params: {
    userId?: string;
    entityType?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entityType, actionType, startDate, endDate } = params;
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (actionType) where.actionType = actionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((l) => ({
        ...l,
        userEmail: l.user.email,
        user: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
