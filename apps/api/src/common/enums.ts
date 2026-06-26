/**
 * Enumerări de tip string care impun constrângerile CHECK din schema bazei de date.
 * Folosite în decoratorii @IsEnum() din class-validator în toate DTO-urile.
 */

export enum AssessmentStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum AssessmentLanguage {
  EN = 'en',
  RO = 'ro',
}

export enum AnswerRefType {
  GATE = 'GATE',
  QUESTION = 'QUESTION',
}

export enum QuestionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum QuestionDomain {
  RISK = 'risk',
  MATURITY = 'maturity',
  GATE = 'gate',
}

export enum AnswerType {
  YES_NO = 'yes_no',
  SCALE = 'scale',
  MULTIPLE_CHOICE = 'multiple_choice',
  YES_NO_UNSURE = 'yes_no_unsure',
}

export enum DedupePairStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
