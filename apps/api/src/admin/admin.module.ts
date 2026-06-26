import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditService } from './audit.service';
import { QuestionsImportService } from './questions-import.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AuditService, QuestionsImportService],
  exports: [AuditService],
})
export class AdminModule {}
