import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Returnează opțiunile de răspuns active, grupabile după tipul de răspuns.
   * Folosite de interfață pentru a randa butoanele de răspuns.
   */
  async getAnswerTypeOptions() {
    return this.prisma.answerTypeOption.findMany({
      where: { isActive: true },
      orderBy: [{ answerType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Returnează cea mai recentă versiune activă a fiecărei întrebări.
   * Întrebările sunt versionate, așa că se selectează un singur rând per `code`,
   * cel cu versiunea cea mai mare (DISTINCT ON (code) ... ORDER BY version DESC).
   */
  async getLatestActive() {
    const questions = await this.prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        version: number;
        status: string;
        domain: string;
        category: string;
        answer_type: string;
        weight_points: number;
        text_ro: string;
        text_en: string;
        recommendation_ro: string | null;
        recommendation_en: string | null;
        options_json: any;
        scoring_inclusion_rule: string | null;
        metadata_json: any;
        created_at: Date;
        created_by_user_id: string | null;
      }>
    >`
      SELECT DISTINCT ON (code) *
      FROM versioned_questions
      WHERE status = 'active'
      ORDER BY code, version DESC
    `;

    // Inject DB-driven gate rules into gate questions (overrides metadata_json.rules)
    const gateCodes = questions.filter((q) => q.domain === 'gate').map((q) => q.code);
    if (gateCodes.length > 0) {
      const dbRules = await this.prisma.gateRule.findMany({
        where: { gateCode: { in: gateCodes }, isActive: true },
        orderBy: [{ gateCode: 'asc' }, { sortOrder: 'asc' }],
      });

      const rulesByGate = new Map<string, any[]>();
      for (const rule of dbRules) {
        if (!rulesByGate.has(rule.gateCode)) rulesByGate.set(rule.gateCode, []);
        rulesByGate.get(rule.gateCode)!.push({
          condition: rule.condition,
          activateQuestions: rule.activateQuestions,
          skipQuestions: rule.skipQuestions,
          setNA: rule.setNa,
          categoryMultipliers: rule.categoryMultipliers,
          effects: rule.effects,
          flags: rule.flags,
        });
      }

      return questions.map((q) => {
        if (q.domain === 'gate' && rulesByGate.has(q.code)) {
          return {
            ...q,
            metadata_json: {
              ...(q.metadata_json ?? {}),
              rules: rulesByGate.get(q.code),
            },
          };
        }
        return q;
      });
    }

    this.logger.log(`Returning ${questions.length} active questions.`);
    return questions;
  }
}
