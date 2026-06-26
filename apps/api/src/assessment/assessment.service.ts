import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { SessionJwtPayload } from '../common';
import {
  calculateScore,
  gates as fallbackGates,
  questions as fallbackQuestions,
  buildDuplicateResolution,
  getAllEffectiveAnswers,
  type Answer as ScoringAnswer,
  type Gate,
  type Question,
  type AnswerValue,
  type DedupePair,
  type DuplicateResolution,
  type ScoringCategoryDef,
  type AnswerTypeOptionDef,
} from '@cyberxscore/scoring';

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // =========================================================================
  // CREARE (anonimă sau autentificată)
  // =========================================================================

  async create(language: 'en' | 'ro', userId?: string) {
    const sessionToken = uuidv4();

    const assessment = await this.prisma.assessment.create({
      data: {
        sessionToken,
        language,
        status: 'in_progress',
        userId: userId || null,
      },
    });

    // Emite un JWT de sesiune anonimă
    const sessionJwt = this.jwtService.sign(
      { sessionToken, assessmentId: assessment.id } as SessionJwtPayload,
      {
        secret: this.configService.get<string>('ANONYMOUS_JWT_SECRET'),
        expiresIn: '24h',
      },
    );

    return {
      assessmentId: assessment.id,
      sessionToken,
      sessionJwt,
    };
  }

  // =========================================================================
  // OBȚINERE EVALUARE + RĂSPUNSURI
  // =========================================================================

  async getById(
    assessmentId: string,
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    this.checkAccess(assessment, userId, sessionPayload);

    const answers = await this.prisma.answer.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    });

    return { assessment, answers };
  }

  // =========================================================================
  // SALVARE RĂSPUNS (doar adăugare)
  // =========================================================================

  async saveAnswer(
    assessmentId: string,
    refType: 'GATE' | 'QUESTION',
    refCode: string,
    valueJson: any,
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    this.checkAccess(assessment, userId, sessionPayload);

    if (assessment.status !== 'in_progress') {
      throw new BadRequestException('Assessment is already completed.');
    }

    const answer = await this.prisma.answer.create({
      data: {
        assessmentId,
        refType,
        refCode,
        valueJson,
      },
    });

    return { answerId: answer.id };
  }

  // =========================================================================
  // FINALIZARE — rulează motorul de calcul al scorului
  // =========================================================================

  async complete(
    assessmentId: string,
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    this.checkAccess(assessment, userId, sessionPayload);

    if (assessment.status !== 'in_progress') {
      throw new BadRequestException('Assessment is already completed.');
    }

    // Preia toate răspunsurile
    const dbAnswers = await this.prisma.answer.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    });

    // Obține cel mai recent răspuns pentru fiecare refCode (model doar-adăugare)
    const latestMap = new Map<string, (typeof dbAnswers)[0]>();
    for (const a of dbAnswers) {
      latestMap.set(a.refCode, a);
    }
    const latestDbAnswers = Array.from(latestMap.values());

    // Convertește răspunsurile din baza de date în formatul motorului de scorare
    const scoringAnswers: ScoringAnswer[] = latestDbAnswers.map((a) => ({
      id: a.id,
      assessmentId: a.assessmentId,
      refType: a.refType as 'GATE' | 'QUESTION',
      refCode: a.refCode,
      value: (a.valueJson as { value: AnswerValue }).value,
      createdAt: a.createdAt.toISOString(),
    }));

    // Preia gate-urile + întrebările din baza de date, cu revenire la valorile predefinite
    const { gates, questions } = await this.loadGatesAndQuestions();

    // Preia perechile de deduplicare active din baza de date
    const dbPairs = await this.prisma.dedupePair.findMany({
      where: { status: 'active' },
    });
    const dedupePairs: DedupePair[] = dbPairs.map((p) => ({
      id: p.id,
      gate_code: p.gateCode,
      question_code: p.questionCode,
      status: p.status,
    }));

    // Construiește rezolvarea deduplicării
    const activatedCodes = scoringAnswers
      .filter((a) => a.refType === 'QUESTION')
      .map((a) => a.refCode);
    const duplicateResolution = buildDuplicateResolution(
      scoringAnswers,
      activatedCodes,
      dedupePairs,
    );

    // Preia categoriile de scorare + opțiunile tipurilor de răspuns din baza de date (revenire la valorile predefinite dacă sunt goale)
    const [categoryDefs, answerTypeOptions] = await Promise.all([
      this.loadCategories(),
      this.loadAnswerTypeOptions(),
    ]);

    // Rulează motorul de calcul al scorului
    const scoreResult = calculateScore(
      scoringAnswers,
      gates,
      questions,
      duplicateResolution,
      categoryDefs,
      answerTypeOptions,
    );

    // Salvează scorul în baza de date
    await this.prisma.score.create({
      data: {
        assessmentId,
        scoreValue: scoreResult.globalScore,
        riskScore: scoreResult.riskScore,
        maturityScore: scoreResult.maturityScore,
        breakdownJson: JSON.parse(JSON.stringify({
          categoryScores: scoreResult.categoryScores,
          penalties: scoreResult.penalties,
          capsApplied: scoreResult.capsApplied,
          criticalGateFailures: scoreResult.criticalGateFailures,
          topGaps: scoreResult.topGaps,
          recommendations: scoreResult.recommendations,
          riskLevel: scoreResult.riskLevel,
        })),
      },
    });

    // Actualizează statusul evaluării
    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      dedupeResolutionJson: duplicateResolution,
    };
    if (userId) {
      updateData.userId = userId;
    }

    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: updateData,
    });

    this.logger.log(
      `Assessment ${assessmentId} completed. Score: ${scoreResult.globalScore}`,
    );

    return { score: scoreResult, assessmentId };
  }

  // =========================================================================
  // REVENDICARE — asociază o evaluare anonimă unui utilizator autentificat
  // =========================================================================

  async claim(assessmentId: string, userId: string, sessionToken: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');

    if (assessment.userId) {
      throw new BadRequestException('Assessment is already claimed.');
    }

    if (assessment.sessionToken !== sessionToken) {
      throw new ForbiddenException('Invalid session token.');
    }

    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { userId },
    });

    return { success: true };
  }

  // =========================================================================
  // REZULTATE
  // =========================================================================

  async getResults(
    assessmentId: string,
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    this.checkAccess(assessment, userId, sessionPayload);

    const score = await this.prisma.score.findFirst({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
    });

    let companyName: string | null = null;
    if (assessment.userId) {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: assessment.userId },
      });
      companyName = profile?.companyName ?? null;
    }

    return { assessment, score, companyName };
  }

  // =========================================================================
  // RĂSPUNSURI (cu rezolvarea deduplicării)
  // =========================================================================

  async getAnswers(
    assessmentId: string,
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    this.checkAccess(assessment, userId, sessionPayload);

    const dbAnswers = await this.prisma.answer.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    });

    // Obține cel mai recent răspuns pentru fiecare refCode
    const latestMap = new Map<string, (typeof dbAnswers)[0]>();
    for (const a of dbAnswers) {
      latestMap.set(a.refCode, a);
    }

    const latestAnswers = Array.from(latestMap.values());

    // Aplică rezolvarea deduplicării din instantaneul evaluării
    const dedupeResolution =
      (assessment.dedupeResolutionJson as DuplicateResolution) ?? {};

    // Convertește în formatul motorului de scorare pentru getAllEffectiveAnswers
    const scoringAnswers: ScoringAnswer[] = latestAnswers.map((a) => ({
      id: a.id,
      assessmentId: a.assessmentId,
      refType: a.refType as 'GATE' | 'QUESTION',
      refCode: a.refCode,
      value: (a.valueJson as { value: AnswerValue }).value,
      createdAt: a.createdAt.toISOString(),
    }));

    const effectiveAnswers = getAllEffectiveAnswers(
      scoringAnswers,
      dedupeResolution,
    );

    return {
      answers: latestAnswers,
      effectiveAnswers,
      dedupeResolution,
      language: assessment.language,
    };
  }

  // =========================================================================
  // ȘTERGERE — ștergere definitivă doar pentru proprietar; în cascadă către răspunsuri + scoruri + linkuri de partajare
  // =========================================================================

  async remove(
    assessmentId: string,
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found.');
    this.checkAccess(assessment, userId, sessionPayload);

    await this.prisma.assessment.delete({ where: { id: assessmentId } });

    this.logger.log(`Assessment ${assessmentId} deleted by user ${userId ?? 'anonymous'}.`);
    return { success: true };
  }

  // =========================================================================
  // ISTORIC (evaluările utilizatorului cu cele mai recente scoruri)
  // =========================================================================

  async getHistory(userId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const assessmentIds = assessments.map((a) => a.id);

    // Preia cel mai recent scor pentru fiecare evaluare
    const scores =
      assessmentIds.length > 0
        ? await this.prisma.score.findMany({
            where: { assessmentId: { in: assessmentIds } },
            orderBy: { createdAt: 'desc' },
          })
        : [];

    // Construiește harta scorurilor (cel mai recent pentru fiecare evaluare)
    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      if (!scoreMap.has(s.assessmentId)) {
        scoreMap.set(s.assessmentId, Number(s.scoreValue));
      }
    }

    return assessments.map((a) => ({
      id: a.id,
      language: a.language,
      status: a.status,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      latestScore: scoreMap.get(a.id) ?? null,
    }));
  }

  // =========================================================================
  // FUNCȚII AUXILIARE
  // =========================================================================

  private checkAccess(
    assessment: { userId: string | null; sessionToken: string },
    userId?: string,
    sessionPayload?: SessionJwtPayload,
  ) {
    // Utilizatorul autentificat este proprietarul evaluării
    if (userId && assessment.userId === userId) return;

    // Token-ul de sesiune anonimă corespunde
    if (
      sessionPayload &&
      assessment.sessionToken === sessionPayload.sessionToken
    )
      return;

    // Evaluare nerevendicată accesată prin token-ul său de sesiune
    if (sessionPayload && !assessment.userId) return;

    throw new ForbiddenException('Access denied.');
  }

  private async loadAnswerTypeOptions(): Promise<AnswerTypeOptionDef[] | undefined> {
    const rows = await this.prisma.answerTypeOption.findMany({
      where: { isActive: true },
      orderBy: [{ answerType: 'asc' }, { sortOrder: 'asc' }],
    });

    if (!rows || rows.length === 0) {
      this.logger.warn('No answer type options in DB, using hardcoded fallback.');
      return undefined;
    }

    return rows.map((r) => ({
      answerType: r.answerType,
      value: r.value,
      labelEn: r.labelEn,
      labelRo: r.labelRo,
      score: Number(r.score),
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }));
  }

  private async loadCategories(): Promise<ScoringCategoryDef[] | undefined> {
    const rows = await this.prisma.scoringCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!rows || rows.length === 0) {
      this.logger.warn('No scoring categories in DB, using hardcoded fallback.');
      return undefined;
    }

    return rows.map((r) => ({
      key: r.key,
      domain: r.domain,
      maxPoints: r.maxPoints,
      nameEn: r.nameEn,
      nameRo: r.nameRo,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }));
  }

  private async loadGatesAndQuestions(): Promise<{
    gates: Gate[];
    questions: Question[];
  }> {
    // Reproduce vizualizarea latest_active_questions:
    // SELECT DISTINCT ON (code) * FROM versioned_questions
    // WHERE status = 'active' ORDER BY code, version DESC
    const dbQuestions = await this.prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        version: number;
        domain: string;
        category: string;
        answer_type: string;
        weight_points: number;
        text_en: string;
        text_ro: string;
        options_json: any;
        scoring_inclusion_rule: string | null;
        metadata_json: any;
        status: string;
      }>
    >`
      SELECT DISTINCT ON (code) *
      FROM versioned_questions
      WHERE status = 'active'
      ORDER BY code, version DESC
    `;

    if (!dbQuestions || dbQuestions.length === 0) {
      this.logger.warn('No questions in DB, using hardcoded fallback.');
      return { gates: fallbackGates, questions: fallbackQuestions };
    }

    const gates: Gate[] = [];
    const questions: Question[] = [];

    // Încarcă regulile gate-urilor din baza de date pentru toate codurile de gate
    const gateCodes = dbQuestions.filter((q) => q.domain === 'gate').map((q) => q.code);
    const dbGateRules = gateCodes.length > 0
      ? await this.prisma.gateRule.findMany({
          where: { gateCode: { in: gateCodes }, isActive: true },
          orderBy: [{ gateCode: 'asc' }, { sortOrder: 'asc' }],
        })
      : [];

    const rulesByGate = new Map<string, any[]>();
    for (const rule of dbGateRules) {
      if (!rulesByGate.has(rule.gateCode)) rulesByGate.set(rule.gateCode, []);
      rulesByGate.get(rule.gateCode)!.push({
        condition: rule.condition,
        activateQuestions: rule.activateQuestions as string[],
        skipQuestions: rule.skipQuestions as string[],
        setNA: rule.setNa as string[],
        categoryMultipliers: rule.categoryMultipliers as Record<string, number>,
        effects: rule.effects as Record<string, any>,
        flags: rule.flags as Record<string, any>,
      });
    }

    for (const dbQ of dbQuestions) {
      if (dbQ.domain === 'gate') {
        const meta = dbQ.metadata_json as { order?: number };
        // Preferă regulile din baza de date; revine la metadata_json.rules pentru compatibilitate retroactivă
        const rules = rulesByGate.get(dbQ.code)
          ?? (dbQ.metadata_json as any)?.rules
          ?? [];
        gates.push({
          id: dbQ.code,
          code: dbQ.code,
          type: dbQ.answer_type as any,
          text: { en: dbQ.text_en, ro: dbQ.text_ro },
          options: this.parseGateOptions(dbQ.options_json),
          rules,
          order: meta?.order ?? 999,
        });
      } else {
        const meta = dbQ.metadata_json as { order?: number };
        questions.push({
          id: dbQ.code,
          code: dbQ.code,
          domain: dbQ.domain as any,
          category: dbQ.category as any,
          answerType: dbQ.answer_type as any,
          text: { en: dbQ.text_en, ro: dbQ.text_ro },
          options: this.parseQuestionOptions(dbQ.options_json),
          weightPoints: dbQ.weight_points,
          order: meta?.order ?? 999,
          scoringInclusionRule: dbQ.scoring_inclusion_rule ?? undefined,
        });
      }
    }

    gates.sort((a, b) => a.order - b.order);
    questions.sort((a, b) => a.order - b.order);

    this.logger.log(
      `Loaded ${gates.length} gates, ${questions.length} questions from DB.`,
    );
    return { gates, questions };
  }

  private parseGateOptions(
    json: any,
  ): { value: string; label: { en: string; ro: string } }[] | undefined {
    if (!json || !Array.isArray(json)) return undefined;
    return json.map((o: any) => ({
      value: String(o.value ?? ''),
      label: {
        en: String(o.label_en ?? o.value ?? ''),
        ro: String(o.label_ro ?? o.value ?? ''),
      },
    }));
  }

  private parseQuestionOptions(
    json: any,
  ):
    | { value: string; label: { en: string; ro: string }; score: number }[]
    | undefined {
    if (!json || !Array.isArray(json)) return undefined;
    return json.map((o: any) => ({
      value: String(o.value ?? ''),
      label: {
        en: String(o.label_en ?? o.value ?? ''),
        ro: String(o.label_ro ?? o.value ?? ''),
      },
      score: typeof o.score === 'number' ? o.score : 0,
    }));
  }
}
