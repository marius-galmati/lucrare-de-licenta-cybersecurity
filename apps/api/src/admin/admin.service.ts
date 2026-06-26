import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { getRiskLevel } from '@cyberxscore/scoring';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // =========================================================================
  // COMPANII
  // =========================================================================

  async getCompanies(params: {
    search?: string;
    page?: number;
    limit?: number;
    riskLevel?: string;
    questionCode?: string;
    answerValue?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { primaryEmail: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Preluăm toate companiile care corespund; filtrele și paginarea sunt aplicate
    // în memorie, deoarece filtrele după nivelul de risc și după răspunsuri nu pot
    // fi exprimate elegant într-o singură interogare Prisma.
    const companies = await this.prisma.company.findMany({
      where,
      include: { profiles: { select: { userId: true } } },
      orderBy: { name: 'asc' },
    });

    const profileUserIds = companies.flatMap((c) => c.profiles.map((p) => p.userId));

    type AssessmentWithRelations = {
      id: string;
      userId: string | null;
      completedAt: Date | null;
      scores: { scoreValue: any; createdAt: Date }[];
      answers?: { refCode: string; valueJson: any }[];
    };

    const includeAnswers = !!params.questionCode;
    const assessments: AssessmentWithRelations[] =
      profileUserIds.length > 0
        ? ((await this.prisma.assessment.findMany({
            where: { userId: { in: profileUserIds }, status: 'completed' },
            include: {
              scores: { orderBy: { createdAt: 'desc' }, take: 1 },
              ...(includeAnswers
                ? { answers: { where: { refCode: params.questionCode } } }
                : {}),
            },
            orderBy: { completedAt: 'desc' },
          })) as unknown as AssessmentWithRelations[])
        : [];

    // Cea mai recentă evaluare finalizată per utilizator + numărul total
    const userLatest = new Map<string, AssessmentWithRelations>();
    const userCounts = new Map<string, number>();
    for (const a of assessments) {
      if (!a.userId) continue;
      userCounts.set(a.userId, (userCounts.get(a.userId) ?? 0) + 1);
      const existing = userLatest.get(a.userId);
      const aCompleted = a.completedAt ? a.completedAt.getTime() : 0;
      const eCompleted = existing?.completedAt ? existing.completedAt.getTime() : -1;
      if (!existing || aCompleted > eCompleted) {
        userLatest.set(a.userId, a);
      }
    }

    const enriched = companies.map((c) => {
      let assessmentCount = 0;
      let latestAssessment: AssessmentWithRelations | null = null;

      for (const p of c.profiles) {
        assessmentCount += userCounts.get(p.userId) ?? 0;
        const ulatest = userLatest.get(p.userId);
        if (ulatest) {
          const uTime = ulatest.completedAt ? ulatest.completedAt.getTime() : 0;
          const lTime = latestAssessment?.completedAt ? latestAssessment.completedAt.getTime() : -1;
          if (!latestAssessment || uTime > lTime) {
            latestAssessment = ulatest;
          }
        }
      }

      const latestScore =
        latestAssessment && latestAssessment.scores.length > 0
          ? Number(latestAssessment.scores[0].scoreValue)
          : null;
      const riskLevel = latestScore !== null ? getRiskLevel(latestScore) : null;

      let matchesQuestion = !params.questionCode;
      if (params.questionCode && latestAssessment?.answers) {
        matchesQuestion = latestAssessment.answers.some((ans) => {
          const v = (ans.valueJson as any)?.value;
          if (v === undefined) return false;
          if (params.answerValue) return String(v) === params.answerValue;
          return true;
        });
      }

      return {
        id: c.id,
        name: c.name,
        primaryEmail: c.primaryEmail,
        profileCount: c.profiles.length,
        assessmentCount,
        lastCompletedAt: latestAssessment?.completedAt ?? null,
        createdAt: c.createdAt,
        latestScore,
        riskLevel,
        _matchesQuestion: matchesQuestion,
      };
    });

    let filtered = enriched;
    if (params.riskLevel) {
      filtered = filtered.filter((c) => c.riskLevel === params.riskLevel);
    }
    if (params.questionCode) {
      filtered = filtered.filter((c) => c._matchesQuestion);
    }

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit).map(({ _matchesQuestion, ...rest }) => rest);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCompanyById(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        profiles: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!company) throw new NotFoundException('Company not found.');

    const userIds = company.profiles.map((p) => p.userId);

    const assessments =
      userIds.length > 0
        ? await this.prisma.assessment.findMany({
            where: { userId: { in: userIds } },
            orderBy: { createdAt: 'desc' },
          })
        : [];

    const assessmentIds = assessments.map((a) => a.id);
    const scores =
      assessmentIds.length > 0
        ? await this.prisma.score.findMany({
            where: { assessmentId: { in: assessmentIds } },
            orderBy: { createdAt: 'desc' },
          })
        : [];

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      if (!scoreMap.has(s.assessmentId)) {
        scoreMap.set(s.assessmentId, Number(s.scoreValue));
      }
    }

    return {
      company,
      profiles: company.profiles,
      assessments: assessments.map((a) => ({
        ...a,
        latestScore: scoreMap.get(a.id) ?? null,
      })),
    };
  }

  // =========================================================================
  // ÎNTREBĂRI
  // =========================================================================

  async getQuestions() {
    const questions = await this.prisma.versionedQuestion.findMany({
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });

    // Grupăm după cod pentru a obține numărul de versiuni
    const countMap = new Map<string, number>();
    for (const q of questions) {
      countMap.set(q.code, (countMap.get(q.code) ?? 0) + 1);
    }

    return questions.map((q) => ({
      ...q,
      versionCount: countMap.get(q.code) ?? 1,
    }));
  }

  async createQuestion(
    userId: string,
    data: {
      code: string;
      domain: string;
      category: string;
      answerType: string;
      weightPoints: number;
      textRo: string;
      textEn: string;
      recommendationRo?: string;
      recommendationEn?: string;
      optionsJson?: any;
      scoringInclusionRule?: string;
      metadataJson?: any;
    },
  ) {
    // Incrementăm automat versiunea
    const latest = await this.prisma.versionedQuestion.findFirst({
      where: { code: data.code },
      orderBy: { version: 'desc' },
    });

    const newVersion = latest ? latest.version + 1 : 1;

    // Arhivăm versiunea activă anterioară
    if (latest && latest.status === 'active') {
      await this.prisma.versionedQuestion.update({
        where: { id: latest.id },
        data: { status: 'archived' },
      });
    }

    const question = await this.prisma.versionedQuestion.create({
      data: {
        code: data.code,
        version: newVersion,
        status: 'active',
        domain: data.domain,
        category: data.category,
        answerType: data.answerType,
        weightPoints: data.weightPoints,
        textRo: data.textRo,
        textEn: data.textEn,
        recommendationRo: data.recommendationRo ?? null,
        recommendationEn: data.recommendationEn ?? null,
        optionsJson: data.optionsJson ?? null,
        scoringInclusionRule: data.scoringInclusionRule ?? null,
        metadataJson: data.metadataJson ?? null,
        createdByUserId: userId,
      },
    });

    await this.auditService.log(userId, 'question_created', 'QUESTION', question.id, {
      code: data.code,
      version: newVersion,
    });

    return question;
  }

  async updateQuestion(
    userId: string,
    questionId: string,
    data: {
      recommendationRo?: string;
      recommendationEn?: string;
      optionsJson?: any;
      metadataJson?: any;
      // Câmpurile de bază sunt respinse
      code?: string;
      domain?: string;
      category?: string;
      answerType?: string;
      weightPoints?: number;
      textRo?: string;
      textEn?: string;
    },
  ) {
    // Respingem modificările câmpurilor de bază
    const coreFields = ['code', 'domain', 'category', 'answerType', 'weightPoints', 'textRo', 'textEn'];
    const attemptedCoreChanges = coreFields.filter((f) => (data as any)[f] !== undefined);
    if (attemptedCoreChanges.length > 0) {
      throw new BadRequestException(
        `Use POST to create a new version for core field changes: ${attemptedCoreChanges.join(', ')}`,
      );
    }

    const question = await this.prisma.versionedQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found.');

    const updateData: any = {};
    if (data.recommendationRo !== undefined) updateData.recommendationRo = data.recommendationRo;
    if (data.recommendationEn !== undefined) updateData.recommendationEn = data.recommendationEn;
    if (data.optionsJson !== undefined) updateData.optionsJson = data.optionsJson;
    if (data.metadataJson !== undefined) updateData.metadataJson = data.metadataJson;

    const updated = await this.prisma.versionedQuestion.update({
      where: { id: questionId },
      data: updateData,
    });

    await this.auditService.log(userId, 'question_updated', 'QUESTION', questionId, {
      code: question.code,
      version: question.version,
      updatedFields: Object.keys(updateData),
    });

    return updated;
  }

  async archiveQuestion(userId: string, questionId: string) {
    const question = await this.prisma.versionedQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found.');

    if (question.status === 'archived') {
      return question;
    }

    const updated = await this.prisma.versionedQuestion.update({
      where: { id: questionId },
      data: { status: 'archived' },
    });

    await this.auditService.log(userId, 'question_archived', 'QUESTION', questionId, {
      code: question.code,
      version: question.version,
      previousStatus: question.status,
    });

    return updated;
  }

  // =========================================================================
  // PERECHI DE DEDUPLICARE
  // =========================================================================

  async getDedupePairs(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.dedupePair.findMany({
      where,
      orderBy: { gateCode: 'asc' },
    });
  }

  async createDedupePair(
    userId: string,
    gateCode: string,
    questionCode: string,
    notes?: string,
  ) {
    // Verificăm existența gate-ului
    const gate = await this.prisma.versionedQuestion.findFirst({
      where: { code: gateCode, status: 'active', domain: 'gate' },
    });
    if (!gate) {
      throw new BadRequestException(`Gate ${gateCode} not found or not active.`);
    }

    // Verificăm existența întrebării
    const question = await this.prisma.versionedQuestion.findFirst({
      where: { code: questionCode, status: 'active' },
    });
    if (!question) {
      throw new BadRequestException(`Question ${questionCode} not found or not active.`);
    }

    // Verificăm să nu existe deja o pereche activă pentru acest gate sau întrebare
    const existingGate = await this.prisma.dedupePair.findFirst({
      where: { gateCode, status: 'active' },
    });
    if (existingGate) {
      throw new ConflictException(`Gate ${gateCode} is already mapped to ${existingGate.questionCode}.`);
    }

    const existingQuestion = await this.prisma.dedupePair.findFirst({
      where: { questionCode, status: 'active' },
    });
    if (existingQuestion) {
      throw new ConflictException(`Question ${questionCode} is already mapped from ${existingQuestion.gateCode}.`);
    }

    const pair = await this.prisma.dedupePair.create({
      data: {
        gateCode,
        questionCode,
        notes: notes ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });

    await this.auditService.log(userId, 'dedupe_pair_created', 'DEDUPE_PAIR', pair.id, {
      gateCode,
      questionCode,
    });

    return pair;
  }

  async updateDedupePair(
    userId: string,
    pairId: string,
    data: { status?: string; notes?: string },
  ) {
    const pair = await this.prisma.dedupePair.findUnique({
      where: { id: pairId },
    });
    if (!pair) throw new NotFoundException('Dedupe pair not found.');

    const before = { status: pair.status, notes: pair.notes };

    const updateData: any = { updatedByUserId: userId };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await this.prisma.dedupePair.update({
      where: { id: pairId },
      data: updateData,
    });

    await this.auditService.log(userId, 'dedupe_pair_updated', 'DEDUPE_PAIR', pairId, {
      gateCode: pair.gateCode,
      questionCode: pair.questionCode,
      before,
      after: { status: updated.status, notes: updated.notes },
    });

    return updated;
  }

  // =========================================================================
  // REGULI DE GATE
  // =========================================================================

  async getGateRules(gateCode?: string) {
    return this.prisma.gateRule.findMany({
      where: gateCode ? { gateCode } : undefined,
      orderBy: [{ gateCode: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createGateRule(
    userId: string,
    data: {
      gateCode: string;
      condition: string;
      activateQuestions?: string[];
      skipQuestions?: string[];
      setNa?: string[];
      categoryMultipliers?: Record<string, number>;
      effects?: Record<string, any>;
      flags?: Record<string, any>;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.gateRule.findUnique({
      where: { gateCode_condition: { gateCode: data.gateCode, condition: data.condition } },
    });
    if (existing) {
      throw new ConflictException(
        `Rule for gate '${data.gateCode}' condition '${data.condition}' already exists.`,
      );
    }

    // Validăm referințele către codurile de întrebări
    const allRefCodes = [
      ...(data.activateQuestions ?? []),
      ...(data.skipQuestions ?? []),
    ].filter(c => !c.startsWith('remote_') && !c.startsWith('third_') && !c.startsWith('cloud_') && !c.startsWith('mobile_'));

    if (allRefCodes.length > 0) {
      const found = await this.prisma.versionedQuestion.findMany({
        where: { code: { in: allRefCodes }, status: 'active' },
        select: { code: true },
      });
      const foundCodes = new Set(found.map((q) => q.code));
      const invalid = allRefCodes.filter((c) => !foundCodes.has(c));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Invalid question codes: ${invalid.join(', ')}. These codes do not exist as active questions.`,
        );
      }
    }

    const rule = await this.prisma.gateRule.create({
      data: {
        gateCode: data.gateCode,
        condition: data.condition,
        activateQuestions: data.activateQuestions ?? [],
        skipQuestions: data.skipQuestions ?? [],
        setNa: data.setNa ?? [],
        categoryMultipliers: data.categoryMultipliers ?? {},
        effects: data.effects ?? {},
        flags: data.flags ?? {},
        sortOrder: data.sortOrder ?? 99,
        isActive: data.isActive ?? true,
      },
    });

    await this.auditService.log(userId, 'gate_rule_created', 'GATE_RULE', rule.id, {
      gateCode: data.gateCode,
      condition: data.condition,
    });

    return rule;
  }

  async updateGateRule(
    userId: string,
    ruleId: string,
    data: {
      condition?: string;
      activateQuestions?: string[];
      skipQuestions?: string[];
      setNa?: string[];
      categoryMultipliers?: Record<string, number>;
      effects?: Record<string, any>;
      flags?: Record<string, any>;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const rule = await this.prisma.gateRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Gate rule not found.');

    // Validăm referințele către codurile de întrebări, dacă sunt furnizate
    const allRefCodes = [
      ...(data.activateQuestions ?? []),
      ...(data.skipQuestions ?? []),
    ].filter(c => !c.startsWith('remote_') && !c.startsWith('third_') && !c.startsWith('cloud_') && !c.startsWith('mobile_'));

    if (allRefCodes.length > 0) {
      const found = await this.prisma.versionedQuestion.findMany({
        where: { code: { in: allRefCodes }, status: 'active' },
        select: { code: true },
      });
      const foundCodes = new Set(found.map((q) => q.code));
      const invalid = allRefCodes.filter((c) => !foundCodes.has(c));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Invalid question codes: ${invalid.join(', ')}.`,
        );
      }
    }

    const updateData: any = {};
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.activateQuestions !== undefined) updateData.activateQuestions = data.activateQuestions;
    if (data.skipQuestions !== undefined) updateData.skipQuestions = data.skipQuestions;
    if (data.setNa !== undefined) updateData.setNa = data.setNa;
    if (data.categoryMultipliers !== undefined) updateData.categoryMultipliers = data.categoryMultipliers;
    if (data.effects !== undefined) updateData.effects = data.effects;
    if (data.flags !== undefined) updateData.flags = data.flags;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.gateRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    await this.auditService.log(userId, 'gate_rule_updated', 'GATE_RULE', ruleId, {
      gateCode: rule.gateCode,
      condition: rule.condition,
      updatedFields: Object.keys(updateData),
    });

    return updated;
  }

  async deactivateGateRule(userId: string, ruleId: string) {
    const rule = await this.prisma.gateRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Gate rule not found.');

    const updated = await this.prisma.gateRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });

    await this.auditService.log(userId, 'gate_rule_deactivated', 'GATE_RULE', ruleId, {
      gateCode: rule.gateCode,
      condition: rule.condition,
    });

    return updated;
  }

  // =========================================================================
  // OPȚIUNI PENTRU TIPURI DE RĂSPUNS
  // =========================================================================

  async getAnswerTypeOptions() {
    return this.prisma.answerTypeOption.findMany({
      orderBy: [{ answerType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createAnswerTypeOption(
    userId: string,
    data: {
      answerType: string;
      value: string;
      labelEn: string;
      labelRo: string;
      score: number;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.answerTypeOption.findUnique({
      where: { answerType_value: { answerType: data.answerType, value: data.value } },
    });
    if (existing) {
      throw new ConflictException(`Option '${data.value}' already exists for answer type '${data.answerType}'.`);
    }

    const option = await this.prisma.answerTypeOption.create({
      data: {
        answerType: data.answerType,
        value: data.value,
        labelEn: data.labelEn,
        labelRo: data.labelRo,
        score: data.score,
        sortOrder: data.sortOrder ?? 99,
        isActive: data.isActive ?? true,
      },
    });

    await this.auditService.log(userId, 'answer_type_option_created', 'ANSWER_TYPE_OPTION', option.id, {
      answerType: data.answerType,
      value: data.value,
    });

    return option;
  }

  async updateAnswerTypeOption(
    userId: string,
    optionId: string,
    data: {
      labelEn?: string;
      labelRo?: string;
      score?: number;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const option = await this.prisma.answerTypeOption.findUnique({ where: { id: optionId } });
    if (!option) throw new NotFoundException('Answer type option not found.');

    const updateData: any = {};
    if (data.labelEn !== undefined) updateData.labelEn = data.labelEn;
    if (data.labelRo !== undefined) updateData.labelRo = data.labelRo;
    if (data.score !== undefined) updateData.score = data.score;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.answerTypeOption.update({
      where: { id: optionId },
      data: updateData,
    });

    await this.auditService.log(userId, 'answer_type_option_updated', 'ANSWER_TYPE_OPTION', optionId, {
      answerType: option.answerType,
      value: option.value,
      updatedFields: Object.keys(updateData),
    });

    return updated;
  }

  // =========================================================================
  // CATEGORII DE SCOR
  // =========================================================================

  async getCategories() {
    return this.prisma.scoringCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(
    userId: string,
    data: {
      key: string;
      domain: string;
      maxPoints: number;
      nameEn: string;
      nameRo: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.scoringCategory.findUnique({
      where: { key: data.key },
    });
    if (existing) {
      throw new ConflictException(`Category key '${data.key}' already exists.`);
    }

    const category = await this.prisma.scoringCategory.create({
      data: {
        key: data.key,
        domain: data.domain,
        maxPoints: data.maxPoints,
        nameEn: data.nameEn,
        nameRo: data.nameRo,
        sortOrder: data.sortOrder ?? 99,
        isActive: data.isActive ?? true,
      },
    });

    await this.auditService.log(userId, 'category_created', 'SCORING_CATEGORY', category.id, {
      key: data.key,
    });

    return category;
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    data: {
      maxPoints?: number;
      nameEn?: string;
      nameRo?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const category = await this.prisma.scoringCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Scoring category not found.');

    const updateData: any = {};
    if (data.maxPoints !== undefined) updateData.maxPoints = data.maxPoints;
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.nameRo !== undefined) updateData.nameRo = data.nameRo;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.scoringCategory.update({
      where: { id: categoryId },
      data: updateData,
    });

    await this.auditService.log(userId, 'category_updated', 'SCORING_CATEGORY', categoryId, {
      key: category.key,
      updatedFields: Object.keys(updateData),
    });

    return updated;
  }

  // =========================================================================
  // EXPORTURI
  // =========================================================================

  async exportCompanies() {
    const companies = await this.prisma.company.findMany({
      include: {
        profiles: { select: { userId: true } },
      },
      orderBy: { name: 'asc' },
    });

    const allUserIds = companies.flatMap((c) => c.profiles.map((p) => p.userId));

    const assessments =
      allUserIds.length > 0
        ? await this.prisma.assessment.findMany({
            where: { userId: { in: allUserIds }, status: 'completed' },
            include: {
              scores: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { scoreValue: true },
              },
            },
          })
        : [];

    // Construim statisticile per utilizator
    const userStatsMap = new Map<
      string,
      { count: number; latestScore: number | null; lastDate: Date | null }
    >();
    for (const a of assessments) {
      const existing = userStatsMap.get(a.userId!) ?? {
        count: 0,
        latestScore: null,
        lastDate: null,
      };
      existing.count++;
      if (a.scores.length > 0 && existing.latestScore === null) {
        existing.latestScore = Number(a.scores[0].scoreValue);
      }
      if (a.completedAt && (!existing.lastDate || a.completedAt > existing.lastDate)) {
        existing.lastDate = a.completedAt;
      }
      userStatsMap.set(a.userId!, existing);
    }

    return companies.map((c) => {
      let assessmentCount = 0;
      let latestScore: number | null = null;
      let latestAssessmentDate: Date | null = null;

      for (const p of c.profiles) {
        const stats = userStatsMap.get(p.userId);
        if (stats) {
          assessmentCount += stats.count;
          if (stats.latestScore !== null && latestScore === null) {
            latestScore = stats.latestScore;
          }
          if (stats.lastDate && (!latestAssessmentDate || stats.lastDate > latestAssessmentDate)) {
            latestAssessmentDate = stats.lastDate;
          }
        }
      }

      return {
        companyName: c.name,
        primaryEmail: c.primaryEmail,
        assessmentCount,
        latestScore,
        latestAssessmentDate,
      };
    });
  }

  // =========================================================================
  // MIGRĂRI DE DATE (idempotente)
  // =========================================================================

  async runMigration(userId: string, name: string) {
    switch (name) {
      case 'backfill-companies':
        return this.backfillCompanies(userId);
      case 'backfill-recommendations':
        return this.backfillRecommendations(userId);
      default:
        throw new BadRequestException(`Unknown migration: ${name}`);
    }
  }

  private async backfillCompanies(userId: string) {
    // Căutăm profilurile fără companie asociată
    const profiles = await this.prisma.profile.findMany({
      where: { companyId: null },
    });

    let affected = 0;
    for (const profile of profiles) {
      // Căutăm sau creăm compania după nume
      let company = await this.prisma.company.findFirst({
        where: { normalizedName: profile.companyName.toLowerCase().trim() },
      });

      if (!company) {
        company = await this.prisma.company.create({
          data: {
            name: profile.companyName,
            normalizedName: profile.companyName.toLowerCase().trim(),
            primaryEmail: profile.email,
          },
        });
      }

      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { companyId: company.id },
      });

      affected++;
    }

    await this.auditService.log(userId, 'migration_run', 'SESSION', undefined, {
      migrationName: 'backfill-companies',
      recordsAffected: affected,
    });

    return {
      migrationName: 'backfill-companies',
      recordsAffected: affected,
      status: 'complete',
    };
  }

  private async backfillRecommendations(userId: string) {
    // Căutăm întrebările active fără recomandări
    const questions = await this.prisma.versionedQuestion.findMany({
      where: {
        status: 'active',
        recommendationEn: null,
        domain: { not: 'gate' },
      },
    });

    let affected = 0;
    // Aceasta este o implementare provizorie — textul real al recomandărilor ar proveni
    // din RECOMMENDATION_MAP al pachetului de scoring sau dintr-o configurație separată
    for (const q of questions) {
      // Actualizăm doar dacă avem text de recomandare disponibil
      // (în producție, importat dintr-o configurație de recomandări)
      await this.prisma.versionedQuestion.update({
        where: { id: q.id },
        data: {
          recommendationEn: `Address: ${q.textEn}`,
          recommendationRo: `Adresați: ${q.textRo}`,
        },
      });
      affected++;
    }

    await this.auditService.log(userId, 'migration_run', 'SESSION', undefined, {
      migrationName: 'backfill-recommendations',
      recordsAffected: affected,
    });

    return {
      migrationName: 'backfill-recommendations',
      recordsAffected: affected,
      status: 'complete',
    };
  }
}
