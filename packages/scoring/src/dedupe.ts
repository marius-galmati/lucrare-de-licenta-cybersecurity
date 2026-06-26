/**
 * Rezolvator de deduplicare CyberXscore (funcții pure)
 * ====================================================
 * Gestionează deduplicarea întrebărilor care se suprapun cu gate-urile.
 * Nu depinde de baza de date — primește perechile de dedupe ca parametru de intrare.
 */

import { Answer, AnswerValue, DuplicateResolution } from './engine';

// Re-exportă DuplicateResolution pentru consumatorii care importă din dedupe
export type { DuplicateResolution } from './engine';

/** Pereche de dedupe preluată din baza de date */
export interface DedupePair {
  id: string;
  gate_code: string;
  question_code: string;
  status: string;
}

/** Răspuns efectiv împreună cu metadatele despre sursă */
export interface EffectiveAnswer {
  refCode: string;
  value: AnswerValue;
  source: 'direct' | 'gate';
  sourceCode?: string;
}

/** Perechi de dedupe predefinite, folosite ca rezervă (pentru scenarii offline/de eroare) */
export const HARDCODED_DEDUPE_PAIRS: DedupePair[] = [
  { id: 'fallback-1', gate_code: 'G1', question_code: 'Q7', status: 'active' },
  { id: 'fallback-2', gate_code: 'G4', question_code: 'Q20', status: 'active' },
  { id: 'fallback-3', gate_code: 'G7', question_code: 'Q33', status: 'active' },
  { id: 'fallback-4', gate_code: 'G10', question_code: 'Q53', status: 'active' },
];

/** Convertește perechile de dedupe într-o mapare gate->întrebare */
export function pairsToGateQuestionMap(pairs: DedupePair[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of pairs) {
    map[pair.gate_code] = pair.question_code;
  }
  return map;
}

/** Convertește perechile de dedupe într-o mapare întrebare->gate (inversă) */
export function pairsToQuestionGateMap(pairs: DedupePair[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of pairs) {
    map[pair.question_code] = pair.gate_code;
  }
  return map;
}

/**
 * Construiește maparea de rezolvare a duplicatelor pornind de la răspunsuri și perechile de dedupe.
 * Pentru fiecare pereche, dacă gate-ul a primit răspuns ȘI întrebarea se află în lista celor activate,
 * răspunsul întrebării este preluat din gate.
 */
export function buildDuplicateResolution(
  answers: Answer[],
  activatedQuestionCodes: string[],
  dedupePairs?: DedupePair[]
): DuplicateResolution {
  const resolution: DuplicateResolution = {};
  const answeredGates = new Set(
    answers
      .filter(a => a.refType === 'GATE')
      .map(a => a.refCode)
  );

  const pairs = dedupePairs ?? HARDCODED_DEDUPE_PAIRS;
  const gateToQuestion = pairsToGateQuestionMap(pairs);

  for (const [gateCode, questionCode] of Object.entries(gateToQuestion)) {
    if (answeredGates.has(gateCode) && activatedQuestionCodes.includes(questionCode)) {
      resolution[questionCode] = gateCode;
    }
  }

  return resolution;
}

/**
 * Elimină întrebările deduplicate din lista celor activate.
 * Returnează întrebările care trebuie efectiv adresate în Faza 2.
 */
export function filterDedupedQuestions(
  activatedQuestionCodes: string[],
  duplicateResolution: DuplicateResolution
): string[] {
  const dedupedSet = new Set(Object.keys(duplicateResolution));
  return activatedQuestionCodes.filter(code => !dedupedSet.has(code));
}

/**
 * Obține răspunsul efectiv pentru un cod de întrebare.
 * Prioritate: 1. Răspuns direct 2. Răspuns din gate prin rezolvare 3. undefined
 */
export function getEffectiveAnswer(
  questionCode: string,
  answers: Answer[],
  duplicateResolution: DuplicateResolution
): EffectiveAnswer | undefined {
  // 1. Răspuns direct
  const directAnswers = answers
    .filter(a => a.refType === 'QUESTION' && a.refCode === questionCode)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (directAnswers.length > 0) {
    return {
      refCode: questionCode,
      value: directAnswers[0].value,
      source: 'direct',
    };
  }

  // 2. Răspuns din gate prin rezolvare
  const gateCode = duplicateResolution[questionCode];
  if (gateCode) {
    const gateAnswers = answers
      .filter(a => a.refType === 'GATE' && a.refCode === gateCode)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (gateAnswers.length > 0) {
      return {
        refCode: questionCode,
        value: gateAnswers[0].value,
        source: 'gate',
        sourceCode: gateCode,
      };
    }
  }

  return undefined;
}

/**
 * Obține toate răspunsurile efective pentru calculul scorului.
 * Combină răspunsurile directe ale întrebărilor cu cele provenite din gate-uri.
 */
export function getAllEffectiveAnswers(
  answers: Answer[],
  duplicateResolution: DuplicateResolution
): EffectiveAnswer[] {
  const effectiveAnswers: EffectiveAnswer[] = [];
  const processedQuestions = new Set<string>();

  // Răspunsuri directe ale întrebărilor
  for (const answer of answers) {
    if (answer.refType === 'QUESTION' && !processedQuestions.has(answer.refCode)) {
      effectiveAnswers.push({
        refCode: answer.refCode,
        value: answer.value,
        source: 'direct',
      });
      processedQuestions.add(answer.refCode);
    }
  }

  // Răspunsuri provenite din gate-uri pentru întrebările deduplicate
  for (const [questionCode, gateCode] of Object.entries(duplicateResolution)) {
    if (!processedQuestions.has(questionCode)) {
      const gateAnswer = answers.find(a => a.refType === 'GATE' && a.refCode === gateCode);
      if (gateAnswer) {
        effectiveAnswers.push({
          refCode: questionCode,
          value: gateAnswer.value,
          source: 'gate',
          sourceCode: gateCode,
        });
        processedQuestions.add(questionCode);
      }
    }
  }

  return effectiveAnswers;
}

/** Verifică dacă o întrebare a primit răspuns prin gate (deduplicată) */
export function wasAnsweredViaGate(
  questionCode: string,
  duplicateResolution: DuplicateResolution
): boolean {
  return questionCode in duplicateResolution;
}
