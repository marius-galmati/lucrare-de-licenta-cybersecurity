import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { QuestionsImportService } from './questions-import.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateDedupePairDto } from './dto/create-dedupe-pair.dto';
import { UpdateDedupePairDto } from './dto/update-dedupe-pair.dto';
import { CreateScoringCategoryDto } from './dto/create-scoring-category.dto';
import { UpdateScoringCategoryDto } from './dto/update-scoring-category.dto';
import { CreateAnswerTypeOptionDto } from './dto/create-answer-type-option.dto';
import { UpdateAnswerTypeOptionDto } from './dto/update-answer-type-option.dto';
import { CreateGateRuleDto } from './dto/create-gate-rule.dto';
import { UpdateGateRuleDto } from './dto/update-gate-rule.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private auditService: AuditService,
    private configService: ConfigService,
    private questionsImportService: QuestionsImportService,
  ) {}

  // ─── COMPANII ───

  @Get('companies')
  async getCompanies(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('questionCode') questionCode?: string,
    @Query('answerValue') answerValue?: string,
  ) {
    return this.adminService.getCompanies({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      riskLevel,
      questionCode,
      answerValue,
    });
  }

  @Get('companies/:id')
  async getCompanyById(@Param('id') id: string) {
    return this.adminService.getCompanyById(id);
  }

  // ─── ÎNTREBĂRI ───

  @Get('questions')
  async getQuestions() {
    return this.adminService.getQuestions();
  }

  @Post('questions')
  async createQuestion(
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.createQuestion(user.id, dto);
  }

  @Put('questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.updateQuestion(user.id, id, dto);
  }

  @Delete('questions/:id')
  async archiveQuestion(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.archiveQuestion(user.id, id);
  }

  // ─── IMPORT ÎNTREBĂRI ───

  @Get('questions/import/template')
  async downloadTemplate(
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const fmt = (format || 'csv').toLowerCase();
    if (fmt === 'csv') {
      const buf = this.questionsImportService.generateCsvTemplate();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="questions-template.csv"');
      res.send(buf);
      return;
    }
    if (fmt === 'xlsx') {
      const buf = await this.questionsImportService.generateXlsxTemplate();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="questions-template.xlsx"');
      res.send(buf);
      return;
    }
    throw new BadRequestException(`Unsupported format '${format}'. Use 'csv' or 'xlsx'.`);
  }

  @Post('questions/import/preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded. Use form field name `file`.');
    return this.questionsImportService.parseAndValidate(file.originalname, file.buffer);
  }

  @Post('questions/import/commit')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async commitImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Use form field name `file`.');
    return this.questionsImportService.commit(user.id, file.originalname, file.buffer);
  }

  // ─── PERECHI DE DEDUPLICARE ───

  @Get('dedupe-pairs')
  async getDedupePairs(@Query('status') status?: string) {
    return this.adminService.getDedupePairs(status);
  }

  @Post('dedupe-pairs')
  async createDedupePair(
    @Body() dto: CreateDedupePairDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.createDedupePair(
      user.id,
      dto.gateCode,
      dto.questionCode,
      dto.notes,
    );
  }

  @Put('dedupe-pairs/:id')
  async updateDedupePair(
    @Param('id') id: string,
    @Body() dto: UpdateDedupePairDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.updateDedupePair(user.id, id, dto);
  }

  // ─── REGULI DE GATE ───

  @Get('gate-rules')
  async getGateRules(@Query('gateCode') gateCode?: string) {
    return this.adminService.getGateRules(gateCode);
  }

  @Post('gate-rules')
  async createGateRule(
    @Body() dto: CreateGateRuleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.createGateRule(user.id, dto);
  }

  @Put('gate-rules/:id')
  async updateGateRule(
    @Param('id') id: string,
    @Body() dto: UpdateGateRuleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.updateGateRule(user.id, id, dto);
  }

  @Put('gate-rules/:id/deactivate')
  async deactivateGateRule(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.deactivateGateRule(user.id, id);
  }

  // ─── OPȚIUNI PENTRU TIPURI DE RĂSPUNS ───

  @Get('answer-type-options')
  async getAnswerTypeOptions() {
    return this.adminService.getAnswerTypeOptions();
  }

  @Post('answer-type-options')
  async createAnswerTypeOption(
    @Body() dto: CreateAnswerTypeOptionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.createAnswerTypeOption(user.id, dto);
  }

  @Put('answer-type-options/:id')
  async updateAnswerTypeOption(
    @Param('id') id: string,
    @Body() dto: UpdateAnswerTypeOptionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.updateAnswerTypeOption(user.id, id, dto);
  }

  // ─── CATEGORII DE SCOR ───

  @Get('categories')
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  async createCategory(
    @Body() dto: CreateScoringCategoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.createCategory(user.id, dto);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateScoringCategoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.updateCategory(user.id, id, dto);
  }

  // ─── JURNALE DE AUDIT ───

  @Get('audit-logs')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('actionType') actionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      userId,
      entityType,
      actionType,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('audit-logs')
  async createAuditLog(
    @Body() dto: CreateAuditLogDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.auditService.log(
      user.id,
      dto.actionType,
      dto.entityType,
      dto.entityId,
      dto.detailsJson,
    );
    return { success: true };
  }

  // ─── EXPORTURI ───

  @Get('exports/companies')
  async exportCompanies() {
    return this.adminService.exportCompanies();
  }

  // ─── MIGRĂRI DE DATE ───

  @Post('migrations/:name')
  async runMigration(
    @Param('name') name: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.runMigration(user.id, name);
  }

  // ─── DEBUG (doar în dezvoltare) ───

  @Get('debug-auth')
  async debugAuth(@Req() req: Request) {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    if (env === 'production') {
      return { error: 'Not available in production.' };
    }

    const user = (req as any).user;
    return {
      user,
      environment: env,
      superAdminEmails: this.configService.get<string>('SUPER_ADMIN_EMAILS', ''),
    };
  }
}
