import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { ClaimAssessmentDto } from './dto/claim-assessment.dto';
import {
  JwtAuthGuard,
  AssessmentAccessGuard,
  CurrentUser,
  SessionJwtPayload,
} from '../common';

@Controller('assessments')
export class AssessmentController {
  constructor(
    private assessmentService: AssessmentService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // POST /api/assessments — nu necesită autentificare (început anonim).
  // Dacă este prezent un JWT valid de utilizator, se atașează userId astfel
  // încât evaluarea să fie deținută de la început (fără revendicare ulterioară
  // pentru fluxul utilizatorului autentificat).
  @Post()
  async create(@Body() dto: CreateAssessmentDto, @Req() req: Request) {
    const userId = this.tryExtractUserId(req);
    return this.assessmentService.create(dto.language, userId);
  }

  private tryExtractUserId(req: Request): string | undefined {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    const token = auth.slice(7);
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload?.sub;
    } catch {
      return undefined;
    }
  }

  // GET /api/assessments — istoric (doar pentru utilizatori autentificați)
  @UseGuards(JwtAuthGuard)
  @Get()
  async history(@CurrentUser() user: { id: string }) {
    return this.assessmentService.getHistory(user.id);
  }

  // GET /api/assessments/:id — obține evaluarea + răspunsurile
  @UseGuards(AssessmentAccessGuard)
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const { userId, sessionPayload } = this.extractAuth(req);
    return this.assessmentService.getById(id, userId, sessionPayload);
  }

  // POST /api/assessments/:id/answers — adaugă un răspuns
  @UseGuards(AssessmentAccessGuard)
  @Post(':id/answers')
  async saveAnswer(
    @Param('id') id: string,
    @Body() dto: SaveAnswerDto,
    @Req() req: Request,
  ) {
    const { userId, sessionPayload } = this.extractAuth(req);
    return this.assessmentService.saveAnswer(
      id,
      dto.refType,
      dto.refCode,
      dto.valueJson,
      userId,
      sessionPayload,
    );
  }

  // POST /api/assessments/:id/complete — rulează calculul scorului
  @UseGuards(AssessmentAccessGuard)
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const { userId, sessionPayload } = this.extractAuth(req);
    return this.assessmentService.complete(id, userId, sessionPayload);
  }

  // POST /api/assessments/:id/claim — asociază o evaluare anonimă unui utilizator
  @UseGuards(JwtAuthGuard)
  @Post(':id/claim')
  async claim(
    @Param('id') id: string,
    @Body() dto: ClaimAssessmentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.assessmentService.claim(id, user.id, dto.sessionToken);
  }

  // GET /api/assessments/:id/results
  @UseGuards(AssessmentAccessGuard)
  @Get(':id/results')
  async results(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const { userId, sessionPayload } = this.extractAuth(req);
    return this.assessmentService.getResults(id, userId, sessionPayload);
  }

  // GET /api/assessments/:id/answers — cu rezolvarea deduplicării
  @UseGuards(AssessmentAccessGuard)
  @Get(':id/answers')
  async answers(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const { userId, sessionPayload } = this.extractAuth(req);
    return this.assessmentService.getAnswers(id, userId, sessionPayload);
  }

  // DELETE /api/assessments/:id — doar pentru proprietar; șterge în cascadă răspunsurile + scorurile + linkurile de partajare
  @UseGuards(AssessmentAccessGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const { userId, sessionPayload } = this.extractAuth(req);
    return this.assessmentService.remove(id, userId, sessionPayload);
  }

  // =========================================================================
  // FUNCȚIE AUXILIARĂ
  // =========================================================================

  private extractAuth(req: Request): {
    userId?: string;
    sessionPayload?: SessionJwtPayload;
  } {
    const user = (req as any).user;
    const sessionPayload = (req as any).sessionPayload;
    return {
      userId: user?.id,
      sessionPayload,
    };
  }
}
