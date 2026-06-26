/**
 * Motorul de scoring CyberXscore
 * ==============================
 * Sursa unică de adevăr pentru întreaga logică de calcul al scorului.
 *
 * Conține tipurile, constantele și funcțiile pure folosite atât de API (calcul
 * pe server, la finalizarea unei evaluări) cât și de interfața web (funcții de
 * afișare a scorului). Modulul nu depinde de baza de date sau de framework.
 */

// ============================================================================
// TIPURI
// ============================================================================

export type Language = 'ro' | 'en';

export type GateAnswerType = 'yes_no' | 'yes_no_unsure' | 'multiple_choice';
export type QuestionAnswerType = 'yes_no' | 'scale' | 'multiple_choice';

export type YesNoAnswer = 'yes' | 'no';
export type YesNoUnsureAnswer = 'yes' | 'no' | 'unsure';
export type ScaleAnswer = 'not_implemented' | 'partially' | 'fully';
export type MultipleChoiceAnswer = string;

export type AnswerValue = YesNoAnswer | YesNoUnsureAnswer | ScaleAnswer | MultipleChoiceAnswer;

export type Domain = 'risk' | 'maturity';

export type RiskCategory =
  | 'risk.iam'
  | 'risk.endpoint_device'
  | 'risk.network_external'
  | 'risk.backup_ransomware'
  | 'risk.monitoring_incident'
  | 'risk.third_party_cloud';

export type MaturityCategory =
  | 'maturity.governance_ownership'
  | 'maturity.policies_processes'
  | 'maturity.awareness_human'
  | 'maturity.asset_visibility'
  | 'maturity.continuous_improvement';

export type Category = RiskCategory | MaturityCategory;

export interface GateRule {
  condition: string;
  activateQuestions?: string[];
  skipQuestions?: string[];
  setNA?: string[];
  flags?: Record<string, string | boolean>;
  categoryMultipliers?: Record<string, number>;
  effects?: Record<string, string | number | boolean>;
}

export interface Gate {
  id: string;
  code: string;
  type: GateAnswerType;
  text: { en: string; ro: string };
  options?: { value: string; label: { en: string; ro: string } }[];
  rules: GateRule[];
  order: number;
}

export interface Question {
  id: string;
  code: string;
  domain: Domain;
  category: Category;
  answerType: QuestionAnswerType;
  text: { en: string; ro: string };
  options?: { value: string; label: { en: string; ro: string }; score: number }[];
  weightPoints: number;
  order: number;
  scoringInclusionRule?: string;
}

export interface Answer {
  id: string;
  assessmentId: string;
  refType: 'GATE' | 'QUESTION';
  refCode: string;
  value: AnswerValue;
  createdAt: string;
}

export interface AssessmentState {
  id: string;
  language: Language;
  status: 'in_progress' | 'completed';
  answers: Answer[];
  activatedQuestions: Set<string>;
  skippedQuestions: Set<string>;
  naBlocks: Set<string>;
  flags: Record<string, string | boolean>;
  categoryMultipliers: Record<string, number>;
  effects: Record<string, string | number | boolean>;
  createdAt: string;
  completedAt?: string;
}

export interface CategoryScoreResult {
  category: Category;
  domain: Domain;
  rawEarned: number;
  rawMax: number;
  normalized: number;
  final: number;
  questionsIncluded: number;
}

export interface ScoreResult {
  globalScore: number;
  riskScore: number;
  maturityScore: number;
  categoryScores: CategoryScoreResult[];
  penalties: number;
  capsApplied: string[];
  criticalGateFailures: string[];
  riskLevel: RiskLevel;
  topGaps: Gap[];
  recommendations: Recommendation[];
  calculatedAt: string;
  duplicateResolution?: Record<string, string>;
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'excellent';

export interface Gap {
  code: string;
  type: 'gate' | 'question';
  category: Category;
  impact: 'critical' | 'high' | 'medium';
  text: { en: string; ro: string };
}

export interface Recommendation {
  code: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: Category;
  text: { en: string; ro: string };
}

// ============================================================================
// CONSTANTE
// ============================================================================

/** Scorul asociat fiecărei valori de răspuns (scală 0-1) */
export const ANSWER_SCORES: Record<string, number> = {
  'yes': 1.0,
  'yes_fully': 1.0,
  'fully': 1.0,
  'no': 0.0,
  'not_implemented': 0.0,
  'partial': 0.6,
  'partially': 0.6,
  'dont_know': 0.0,
  'unsure': 0.0,
};

/** Punctajul maxim pentru fiecare categorie */
export const CATEGORY_MAX_POINTS: Record<Category, number> = {
  'risk.iam': 15,
  'risk.endpoint_device': 12,
  'risk.network_external': 10,
  'risk.backup_ransomware': 13,
  'risk.monitoring_incident': 6,
  'risk.third_party_cloud': 4,
  'maturity.governance_ownership': 10,
  'maturity.policies_processes': 8,
  'maturity.awareness_human': 8,
  'maturity.asset_visibility': 6,
  'maturity.continuous_improvement': 8,
};

/** Denumirile bilingve afișate pentru categorii */
export const CATEGORY_NAMES: Record<Category, { en: string; ro: string }> = {
  'risk.iam': { en: 'Identity & Access Management', ro: 'Identitate și Control Acces' },
  'risk.endpoint_device': { en: 'Endpoint & Device Security', ro: 'Securitate Endpoint și Dispozitive' },
  'risk.network_external': { en: 'Network & External Security', ro: 'Securitate Rețea și Externă' },
  'risk.backup_ransomware': { en: 'Backup & Ransomware Protection', ro: 'Backup și Protecție Ransomware' },
  'risk.monitoring_incident': { en: 'Monitoring & Incident Response', ro: 'Monitorizare și Răspuns la Incidente' },
  'risk.third_party_cloud': { en: 'Third-Party & Cloud', ro: 'Furnizori Terți și Cloud' },
  'maturity.governance_ownership': { en: 'Governance & Ownership', ro: 'Guvernanță și Responsabilitate' },
  'maturity.policies_processes': { en: 'Policies & Processes', ro: 'Politici și Procese' },
  'maturity.awareness_human': { en: 'Security Awareness', ro: 'Conștientizare Securitate' },
  'maturity.asset_visibility': { en: 'Asset Visibility', ro: 'Vizibilitate Active' },
  'maturity.continuous_improvement': { en: 'Continuous Improvement', ro: 'Îmbunătățire Continuă' },
};

/** Toate cele 11 categorii în ordinea canonică */
export const ALL_CATEGORIES: Category[] = [
  'risk.iam',
  'risk.endpoint_device',
  'risk.network_external',
  'risk.backup_ransomware',
  'risk.monitoring_incident',
  'risk.third_party_cloud',
  'maturity.governance_ownership',
  'maturity.policies_processes',
  'maturity.awareness_human',
  'maturity.asset_visibility',
  'maturity.continuous_improvement',
];

// ============================================================================
// SUPORT PENTRU CATEGORII DEFINITE ÎN BAZA DE DATE
// ============================================================================

/** Structura unei opțiuni de tip de răspuns provenită din baza de date / API-ul de administrare */
export interface AnswerTypeOptionDef {
  answerType: string;
  value: string;
  labelEn: string;
  labelRo: string;
  score: number;
  sortOrder: number;
  isActive: boolean;
}

/** Construiește o mapare plată valoare→scor din opțiunile de tip de răspuns definite în baza de date */
export function buildAnswerScoresMap(defs: AnswerTypeOptionDef[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const d of defs) {
    if (d.isActive) map[d.value] = d.score;
  }
  return map;
}

/** Structura unei categorii provenită din baza de date / API-ul de administrare */
export interface ScoringCategoryDef {
  key: string;
  domain: string;
  maxPoints: number;
  nameEn: string;
  nameRo: string;
  sortOrder: number;
  isActive: boolean;
}

/** Convertește un array de categorii din baza de date în mapările de căutare folosite intern */
export function buildCategoryMaps(defs: ScoringCategoryDef[]): {
  maxPoints: Record<string, number>;
  names: Record<string, { en: string; ro: string }>;
  orderedKeys: string[];
} {
  const maxPoints: Record<string, number> = {};
  const names: Record<string, { en: string; ro: string }> = {};
  const orderedKeys = defs
    .filter((d) => d.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => d.key);
  for (const d of defs) {
    maxPoints[d.key] = d.maxPoints;
    names[d.key] = { en: d.nameEn, ro: d.nameRo };
  }
  return { maxPoints, names, orderedKeys };
}

// ============================================================================
// TIPURI PENTRU REZOLVAREA DUPLICATELOR
// ============================================================================

/** Mapare questionCode -> gateCode pentru întrebările deduplicate */
export type DuplicateResolution = Record<string, string>;

// ============================================================================
// FUNCȚII AUXILIARE
// ============================================================================

/** Obține valoarea unui răspuns din array-ul de răspunsuri după refCode */
export const getAnswerValue = (answers: Answer[], refCode: string): AnswerValue | undefined => {
  const answer = answers.find(a => a.refCode === refCode);
  return answer?.value;
};

/** Obține valoarea unui răspuns cu suport pentru dedupe (verifică răspunsurile gate pentru întrebările deduplicate) */
const getAnswerValueWithDedupe = (
  answers: Answer[],
  refCode: string,
  duplicateResolution: DuplicateResolution
): AnswerValue | undefined => {
  const directAnswer = answers.find(a => a.refCode === refCode && a.refType === 'QUESTION');
  if (directAnswer) return directAnswer.value;

  const gateCode = duplicateResolution[refCode];
  if (gateCode) {
    const gateAnswer = answers.find(a => a.refCode === gateCode && a.refType === 'GATE');
    if (gateAnswer) return gateAnswer.value;
  }

  const answer = answers.find(a => a.refCode === refCode);
  return answer?.value;
};

/** Obține scorul numeric pentru un răspuns (scală 0-1) */
const getAnswerScore = (
  value: AnswerValue | undefined,
  question: Question | undefined,
  answerScoresMap?: Record<string, number>
): number => {
  if (!value) return 0;

  if (question?.options) {
    const option = question.options.find(o => o.value === value);
    if (option) return option.score;
  }

  const scoresMap = answerScoresMap ?? ANSWER_SCORES;
  return scoresMap[value as string] ?? ANSWER_SCORES[value as string] ?? 0;
};

/** Verifică dacă o regulă de includere în scoring este îndeplinită */
const checkScoringInclusionRule = (rule: string | undefined, answers: Answer[]): boolean => {
  if (!rule) return true;

  const orParts = rule.split('||').map(p => p.trim());

  for (const part of orParts) {
    const match = part.match(/(\w+)\s*(==|!=)\s*(\w+)/);
    if (match) {
      const [, code, operator, expectedValue] = match;
      const actualValue = getAnswerValue(answers, code);
      if (operator === '==' && actualValue === expectedValue) return true;
      if (operator === '!=' && actualValue !== expectedValue) return true;
    }
  }

  return orParts.length === 0;
};

// ============================================================================
// PROCESAREA GATE-URILOR
// ============================================================================

/** Determină ce întrebări sunt active pe baza răspunsurilor la gate-uri */
export const determineActiveQuestions = (
  answers: Answer[],
  gates: Gate[]
): { activated: Set<string>; skipped: Set<string>; naBlocks: Set<string> } => {
  const activated = new Set<string>();
  const skipped = new Set<string>();
  const naBlocks = new Set<string>();

  for (const gate of gates) {
    const gateAnswer = getAnswerValue(answers, gate.code);
    if (!gateAnswer) continue;

    const matchingRule = gate.rules.find(r => r.condition === gateAnswer);
    if (!matchingRule) continue;

    matchingRule.activateQuestions?.forEach(q => activated.add(q));
    matchingRule.skipQuestions?.forEach(q => skipped.add(q));
    matchingRule.setNA?.forEach(block => naBlocks.add(block));
  }

  skipped.forEach(q => activated.delete(q));
  return { activated, skipped, naBlocks };
};

/**
 * Determină întrebările active pornind de la un Map<gateCode, answerValue>.
 * Sursă unică de adevăr pentru interfață — elimină logica duplicată din stratul UI.
 */
export const determineActiveQuestionsFromMap = (
  gateAnswers: Map<string, string>,
  gates: Gate[]
): { activated: Set<string>; skipped: Set<string>; naBlocks: Set<string> } => {
  const answers: Answer[] = Array.from(gateAnswers.entries()).map(([code, value]) => ({
    id: code,
    assessmentId: '',
    refType: 'GATE' as const,
    refCode: code,
    value: value as AnswerValue,
    createdAt: new Date().toISOString(),
  }));
  return determineActiveQuestions(answers, gates);
};

/** Colectează multiplicatorii de categorie din răspunsurile la gate-uri */
export const collectCategoryMultipliers = (
  answers: Answer[],
  gates: Gate[]
): Record<string, number> => {
  const multipliers: Record<string, number> = {};

  for (const gate of gates) {
    const gateAnswer = getAnswerValue(answers, gate.code);
    if (!gateAnswer) continue;

    const matchingRule = gate.rules.find(r => r.condition === gateAnswer);
    if (!matchingRule?.categoryMultipliers) continue;

    for (const [category, multiplier] of Object.entries(matchingRule.categoryMultipliers)) {
      multipliers[category] = (multipliers[category] || 1) * multiplier;
    }
  }

  return multipliers;
};

/** Colectează efectele din răspunsurile la gate-uri */
export const collectEffects = (
  answers: Answer[],
  gates: Gate[]
): Record<string, string | number | boolean> => {
  const effects: Record<string, string | number | boolean> = {};

  for (const gate of gates) {
    const gateAnswer = getAnswerValue(answers, gate.code);
    if (!gateAnswer) continue;

    const matchingRule = gate.rules.find(r => r.condition === gateAnswer);
    if (!matchingRule?.effects) continue;

    Object.assign(effects, matchingRule.effects);
  }

  return effects;
};

// ============================================================================
// EȘECURI ALE GATE-URILOR CRITICE
// ============================================================================

/** Verifică eșecurile gate-urilor critice care declanșează plafonarea scorului */
export const checkCriticalGateFailures = (answers: Answer[]): string[] => {
  const failures: string[] = [];

  // CG1_ADMIN_MISUSE: G2 == YES
  if (getAnswerValue(answers, 'G2') === 'yes') {
    failures.push('CG1_ADMIN_MISUSE');
  }

  // CG2_INET_EXPOSURE_HIGH: G4 în [many, dont_know]
  const g4 = getAnswerValue(answers, 'G4');
  if (g4 === 'many' || g4 === 'dont_know') {
    failures.push('CG2_INET_EXPOSURE_HIGH');
  }

  // CG3_NO_BACKUP: G7 == NO
  if (getAnswerValue(answers, 'G7') === 'no') {
    failures.push('CG3_NO_BACKUP');
  }

  // CG4_REMOTE_NO_MFA: G3 == YES AND Q21 == NO
  if (getAnswerValue(answers, 'G3') === 'yes' && getAnswerValue(answers, 'Q21') === 'no') {
    failures.push('CG4_REMOTE_NO_MFA');
  }

  // CG5_ADMIN_MFA_OFF: Q11 == NO
  if (getAnswerValue(answers, 'Q11') === 'no') {
    failures.push('CG5_ADMIN_MFA_OFF');
  }

  return failures;
};

// ============================================================================
// CALCULUL SCORULUI PE CATEGORIE
// ============================================================================

/** Calculează scorul pentru o singură categorie */
const calculateCategoryScore = (
  category: string,
  answers: Answer[],
  activeQuestions: Set<string>,
  multipliers: Record<string, number>,
  effects: Record<string, string | number | boolean>,
  questions: Question[],
  duplicateResolution: DuplicateResolution = {},
  maxPointsMap?: Record<string, number>,
  answerScoresMap?: Record<string, number>
): CategoryScoreResult => {
  const categoryQuestions = questions.filter(q => q.category === category);
  const domain: Domain = category.startsWith('risk.') ? 'risk' : 'maturity';
  const maxPoints = maxPointsMap
    ? (maxPointsMap[category] ?? 0)
    : (CATEGORY_MAX_POINTS as Record<string, number>)[category] ?? 0;

  let rawEarned = 0;
  let rawMax = 0;
  let questionsIncluded = 0;

  for (const question of categoryQuestions) {
    const isDeduped = question.code in duplicateResolution;
    const isActive = activeQuestions.has(question.code) || isDeduped;
    const hasWeight = question.weightPoints > 0;
    const meetsInclusionRule = checkScoringInclusionRule(question.scoringInclusionRule, answers);

    const shouldInclude = isActive && (hasWeight || meetsInclusionRule);
    if (!shouldInclude) continue;

    const answerValue = getAnswerValueWithDedupe(answers, question.code, duplicateResolution);
    if (!answerValue) continue;

    const answerScore = getAnswerScore(answerValue, question, answerScoresMap);
    const weight = question.weightPoints > 0 ? question.weightPoints : 1;

    rawEarned += weight * answerScore;
    rawMax += weight;
    questionsIncluded++;
  }

  // Normalizează la punctajul maxim al categoriei
  const normalized = rawMax > 0 ? (rawEarned / rawMax) * maxPoints : 0;

  // Aplică multiplicatorul (împarte scorul, crește severitatea riscului)
  const categoryMultiplier = multipliers[category] || 1;
  let final = normalized / categoryMultiplier;

  // Aplică plafonul de eficacitate a monitorizării dacă G8 == UNSURE
  if (category === 'risk.monitoring_incident' && effects.monitoring_effectiveness_cap_within_category) {
    const cap = maxPoints * (effects.monitoring_effectiveness_cap_within_category as number);
    final = Math.min(final, cap);
  }

  // Forțează scorul de backup la zero dacă G7 == NO
  if (category === 'risk.backup_ransomware' && effects.backup_score_force_zero) {
    final = 0;
  }

  // Limitează la maximul categoriei
  final = Math.max(0, Math.min(final, maxPoints));

  return {
    category: category as Category,
    domain,
    rawEarned,
    rawMax,
    normalized,
    final: Math.round(final * 100) / 100,
    questionsIncluded,
  };
};

// ============================================================================
// GENERAREA LACUNELOR ȘI A RECOMANDĂRILOR
// ============================================================================

/** Textele de recomandare pentru codurile de întrebare cunoscute */
const RECOMMENDATION_MAP: Record<string, { en: string; ro: string }> = {
  'G7': {
    en: 'Implement regular backups for all critical business data immediately. Follow the 3-2-1 rule.',
    ro: 'Implementați backup regulat pentru toate datele critice imediat. Urmați regula 3-2-1.',
  },
  'Q11': {
    en: 'Enable MFA on all administrative accounts as top priority.',
    ro: 'Activați MFA pe toate conturile administrative ca prioritate maximă.',
  },
  'Q21': {
    en: 'Protect remote access (VPN/RDP) with multi-factor authentication.',
    ro: 'Protejați accesul remote (VPN/RDP) cu autentificare multi-factor.',
  },
  'G2': {
    en: 'Separate admin accounts from daily-use accounts. Create dedicated admin accounts.',
    ro: 'Separați conturile admin de conturile de uz zilnic. Creați conturi admin dedicate.',
  },
  'Q25': {
    en: 'Deploy endpoint protection (AV/EDR) on all workstations and servers.',
    ro: 'Implementați protecție endpoint (AV/EDR) pe toate stațiile și serverele.',
  },
  'Q26': {
    en: 'Establish a regular patching schedule for OS and applications.',
    ro: 'Stabiliți un program regulat de actualizări pentru SO și aplicații.',
  },
  'Q33': {
    en: 'Implement automated daily backups for all critical data.',
    ro: 'Implementați backup-uri zilnice automatizate pentru toate datele critice.',
  },
  'Q34': {
    en: 'Store backups offsite or in isolated cloud storage.',
    ro: 'Stocați backup-urile în afara sediului sau în cloud izolat.',
  },
  'Q47': {
    en: 'Establish basic cybersecurity training for all employees.',
    ro: 'Stabiliți instruire de bază în securitate cibernetică pentru toți angajații.',
  },
  'Q17': {
    en: 'Deploy and properly configure a firewall between internal network and Internet.',
    ro: 'Implementați și configurați un firewall între rețeaua internă și Internet.',
  },
  'Q29': {
    en: 'Create and maintain an inventory of all IT devices and systems.',
    ro: 'Creați și mențineți o evidență a tuturor dispozitivelor și sistemelor IT.',
  },
};

/** Obține textul de recomandare pentru un cod de întrebare */
const getRecommendationText = (
  code: string,
  questions: Question[]
): { en: string; ro: string } => {
  if (RECOMMENDATION_MAP[code]) return RECOMMENDATION_MAP[code];
  const question = questions.find(q => q.code === code);
  return {
    en: question ? `Address: ${question.text.en}` : 'Address this security gap.',
    ro: question ? `Adresați: ${question.text.ro}` : 'Adresați această lacună de securitate.',
  };
};

/** Generează principalele lacune cu suport pentru dedupe */
const generateTopGaps = (
  answers: Answer[],
  questions: Question[],
  duplicateResolution: DuplicateResolution
): Gap[] => {
  const gaps: Gap[] = [];

  const criticalFailures = checkCriticalGateFailures(answers);

  if (criticalFailures.includes('CG3_NO_BACKUP')) {
    gaps.push({
      code: 'G7', type: 'gate', category: 'risk.backup_ransomware', impact: 'critical',
      text: {
        en: 'No regular backup for critical data - major ransomware vulnerability',
        ro: 'Lipsă backup regulat pentru date critice - vulnerabilitate majoră ransomware',
      },
    });
  }

  if (criticalFailures.includes('CG5_ADMIN_MFA_OFF')) {
    gaps.push({
      code: 'Q11', type: 'question', category: 'risk.iam', impact: 'critical',
      text: {
        en: 'Administrative accounts lack MFA - high risk of unauthorized access',
        ro: 'Conturile administrative nu au MFA - risc ridicat de acces neautorizat',
      },
    });
  }

  if (criticalFailures.includes('CG4_REMOTE_NO_MFA')) {
    gaps.push({
      code: 'Q21', type: 'question', category: 'risk.network_external', impact: 'critical',
      text: {
        en: 'Remote access (VPN/RDP) not protected with MFA',
        ro: 'Acces remote (VPN/RDP) neprotejat cu MFA',
      },
    });
  }

  if (criticalFailures.includes('CG1_ADMIN_MISUSE')) {
    gaps.push({
      code: 'G2', type: 'gate', category: 'risk.iam', impact: 'high',
      text: {
        en: 'Administrative accounts used for daily activities - separation of privileges needed',
        ro: 'Conturi administrative folosite zilnic - necesară separarea privilegiilor',
      },
    });
  }

  for (const question of questions) {
    const answerValue = getAnswerValueWithDedupe(answers, question.code, duplicateResolution);
    if (!answerValue) continue;

    const score = getAnswerScore(answerValue, question);
    if (score < 0.5 && question.weightPoints >= 3) {
      gaps.push({
        code: question.code,
        type: 'question',
        category: question.category,
        impact: question.weightPoints >= 4 ? 'high' : 'medium',
        text: question.text,
      });
    }
  }

  const impactOrder = { critical: 0, high: 1, medium: 2 };
  return gaps
    .sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
    .slice(0, 3);
};

/** Generează recomandările cu suport pentru dedupe */
const generateRecommendations = (
  answers: Answer[],
  gaps: Gap[],
  questions: Question[],
  duplicateResolution: DuplicateResolution
): Recommendation[] => {
  const recommendations: Recommendation[] = [];

  for (const gap of gaps) {
    const question = questions.find(q => q.code === gap.code);
    if (question) {
      recommendations.push({
        code: gap.code,
        priority: gap.impact === 'critical' ? 'critical' : gap.impact === 'high' ? 'high' : 'medium',
        category: gap.category,
        text: getRecommendationText(gap.code, questions),
      });
    }
  }

  for (const question of questions) {
    if (recommendations.some(r => r.code === question.code)) continue;

    const answerValue = getAnswerValueWithDedupe(answers, question.code, duplicateResolution);
    if (!answerValue) continue;

    const score = getAnswerScore(answerValue, question);
    if (score < 0.6) {
      recommendations.push({
        code: question.code,
        priority: question.weightPoints >= 4 ? 'high' : question.weightPoints >= 2 ? 'medium' : 'low',
        category: question.category,
        text: getRecommendationText(question.code, questions),
      });
    }
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);
};

// ============================================================================
// NIVELUL DE RISC
// ============================================================================

/** Mapează un scor 0-99 la un nivel de risc */
export const getRiskLevel = (score: number): RiskLevel => {
  if (score < 20) return 'critical';
  if (score < 40) return 'high';
  if (score < 60) return 'medium';
  if (score < 80) return 'low';
  return 'excellent';
};

// ============================================================================
// FUNCȚIA PRINCIPALĂ DE CALCUL AL SCORULUI
// ============================================================================

/**
 * Calculează scorul CyberXscore complet pornind de la răspunsuri, gate-uri și întrebări.
 *
 * Aceasta este funcția canonică de scoring. Toate căile de calcul al scorului TREBUIE să o folosească.
 */
export const calculateScore = (
  answers: Answer[],
  gates: Gate[],
  questions: Question[],
  providedDuplicateResolution?: DuplicateResolution,
  categoryDefs?: ScoringCategoryDef[],
  answerTypeOptions?: AnswerTypeOptionDef[]
): ScoreResult => {
  const { activated } = determineActiveQuestions(answers, gates);
  const multipliers = collectCategoryMultipliers(answers, gates);
  const effects = collectEffects(answers, gates);
  const criticalFailures = checkCriticalGateFailures(answers);

  const duplicateResolution = providedDuplicateResolution ?? {};

  // Folosește categoriile din baza de date dacă sunt furnizate, altfel revine la constantele predefinite
  let activeCategoryKeys: string[];
  let categoryMaxPointsMap: Record<string, number>;
  if (categoryDefs && categoryDefs.length > 0) {
    const maps = buildCategoryMaps(categoryDefs);
    activeCategoryKeys = maps.orderedKeys;
    categoryMaxPointsMap = maps.maxPoints;
  } else {
    activeCategoryKeys = ALL_CATEGORIES as unknown as string[];
    categoryMaxPointsMap = CATEGORY_MAX_POINTS as Record<string, number>;
  }

  // Folosește scorurile de răspuns din baza de date dacă sunt furnizate, altfel revine la ANSWER_SCORES predefinite
  const answerScoresMap = answerTypeOptions && answerTypeOptions.length > 0
    ? buildAnswerScoresMap(answerTypeOptions)
    : undefined;

  const categoryScores = activeCategoryKeys.map(category =>
    calculateCategoryScore(category, answers, activated, multipliers, effects, questions, duplicateResolution, categoryMaxPointsMap, answerScoresMap)
  );

  const riskScore = categoryScores
    .filter(cs => cs.domain === 'risk')
    .reduce((sum, cs) => sum + cs.final, 0);

  const maturityScore = categoryScores
    .filter(cs => cs.domain === 'maturity')
    .reduce((sum, cs) => sum + cs.final, 0);

  // Aplică penalizările
  let penalties = 0;
  if (effects.final_score_penalty) {
    penalties = effects.final_score_penalty as number;
  }

  // Calculează scorul înainte de plafonare
  const preCap = Math.min(99, Math.round(riskScore + maturityScore + penalties));

  // Aplică plafoanele
  const capsApplied: string[] = [];
  let finalScoreCap = 99;

  // HR1_BACKUP_CAP: dacă G7 == NO, plafonează la 55
  if (effects.final_score_cap) {
    finalScoreCap = Math.min(finalScoreCap, effects.final_score_cap as number);
    capsApplied.push('HR1_BACKUP_CAP');
  }

  // HR2_CRITICAL_GATES_CAP: dacă există >=2 eșecuri critice, plafonează la 65
  if (criticalFailures.length >= 2) {
    finalScoreCap = Math.min(finalScoreCap, 65);
    capsApplied.push('HR2_CRITICAL_GATES_CAP');
  }

  const globalScore = Math.max(0, Math.min(preCap, finalScoreCap));

  const topGaps = generateTopGaps(answers, questions, duplicateResolution);
  const recommendations = generateRecommendations(answers, topGaps, questions, duplicateResolution);

  return {
    globalScore,
    riskScore: Math.round(riskScore * 100) / 100,
    maturityScore: Math.round(maturityScore * 100) / 100,
    categoryScores,
    penalties,
    capsApplied,
    criticalGateFailures: criticalFailures,
    riskLevel: getRiskLevel(globalScore),
    topGaps,
    recommendations,
    calculatedAt: new Date().toISOString(),
    duplicateResolution,
  };
};

// ============================================================================
// FUNCȚII AUXILIARE DE AFIȘARE
// ============================================================================

/** Obține clasa Tailwind de culoare a textului pentru un nivel de risc */
export const getScoreColor = (riskLevel: RiskLevel): string => {
  switch (riskLevel) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-warning';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-success';
    case 'excellent': return 'text-primary';
    default: return 'text-foreground';
  }
};

/** Obține clasa Tailwind de umbră pentru un nivel de risc */
export const getScoreGlow = (riskLevel: RiskLevel): string => {
  switch (riskLevel) {
    case 'critical': return 'shadow-[0_0_30px_rgba(239,68,68,0.3)]';
    case 'high': return 'shadow-[0_0_30px_rgba(245,158,11,0.3)]';
    case 'medium': return 'shadow-[0_0_30px_rgba(250,204,21,0.3)]';
    case 'low': return 'shadow-[0_0_30px_rgba(34,197,94,0.3)]';
    case 'excellent': return 'shadow-[0_0_30px_rgba(59,130,246,0.3)]';
    default: return '';
  }
};

/** Obține tuplul de culoare RGB pentru exportul PDF */
export const getScoreColorRGB = (riskLevel: RiskLevel): [number, number, number] => {
  switch (riskLevel) {
    case 'critical': return [220, 38, 38];
    case 'high': return [245, 158, 11];
    case 'medium': return [250, 204, 21];
    case 'low': return [34, 197, 94];
    case 'excellent': return [59, 130, 246];
    default: return [107, 114, 128];
  }
};
