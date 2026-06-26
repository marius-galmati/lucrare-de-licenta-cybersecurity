'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ChatMessage from '@/components/ChatMessage';
import AccountGate from '@/components/AccountGate';
import TransitionScreen from '@/components/TransitionScreen';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, getAccessToken, getSessionJwt, setSessionJwt, clearSessionJwt } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Shield } from 'lucide-react';
import { determineActiveQuestionsFromMap, type Gate } from '@cyberxscore/scoring';
import { toast } from 'sonner';

type FlowPhase = 'loading' | 'gates' | 'transition' | 'assessment' | 'account_gate' | 'calculating';

interface GateData {
  code: string;
  text_en: string;
  text_ro: string;
  answer_type: string;
  options_json: any;
  metadata_json: any;
}

interface QuestionData {
  code: string;
  text_en: string;
  text_ro: string;
  answer_type: string;
  options_json: any;
  domain: string;
  category: string;
  metadata_json: any;
}

interface AnswerRecord {
  refType: string;
  refCode: string;
  value: string;
}

const STORAGE_KEY_ID = 'current_assessment_id';
const STORAGE_KEY_TOKEN = 'session_token';
const STORAGE_KEY_JWT = 'session_jwt';

function getOrder(meta: any): number {
  if (!meta || typeof meta !== 'object') return 999;
  return typeof meta.order === 'number' ? meta.order : 999;
}

function parseRules(meta: any): any[] {
  if (!meta || typeof meta !== 'object') return [];
  return meta.rules || [];
}

function parseOptions(json: any): { value: string; label_en: string; label_ro: string }[] {
  if (!json || !Array.isArray(json)) return [];
  return json.map((o: any) => ({
    value: String(o.value || ''),
    label_en: String(o.label_en || o.value || ''),
    label_ro: String(o.label_ro || o.value || ''),
  }));
}

// Convert API gate data (with DB-injected rules) to scoring engine Gate type
function toScoringGates(apiGates: GateData[]): Gate[] {
  return apiGates.map(g => ({
    id: g.code,
    code: g.code,
    type: g.answer_type as any,
    text: { en: g.text_en, ro: g.text_ro },
    options: parseOptions(g.options_json).map(o => ({
      value: o.value,
      label: { en: o.label_en, ro: o.label_ro },
    })),
    rules: parseRules(g.metadata_json),
    order: getOrder(g.metadata_json),
  }));
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function AssessmentPage() {
  const { language, t } = useLanguage();
  const router = useRouter();

  const [flowPhase, setFlowPhase] = useState<FlowPhase>('loading');
  const [allGates, setAllGates] = useState<GateData[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionData[]>([]);
  // DB-driven answer type options: answerType → sorted option list
  const [answerTypeOptions, setAnswerTypeOptions] = useState<Record<string, { value: string; labelEn: string; labelRo: string; score: number }[]>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionJwt, setSessionJwtState] = useState<string | null>(null);

  // Gate phase
  const [gateIndex, setGateIndex] = useState(0);
  const [gateAnswers, setGateAnswers] = useState<Map<string, string>>(new Map());

  // Assessment phase
  const [activatedCodes, setActivatedCodes] = useState<string[]>([]);
  const [assessmentIndex, setAssessmentIndex] = useState(0);

  // UI state
  const [showContent, setShowContent] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isAccountLoading, setIsAccountLoading] = useState(false);

  const orderedGates = useMemo(() =>
    [...allGates].sort((a, b) => getOrder(a.metadata_json) - getOrder(b.metadata_json)),
    [allGates]
  );

  const assessmentQuestions = useMemo(() => {
    if (activatedCodes.length === 0) return [];
    return allQuestions
      .filter(q => activatedCodes.includes(q.code))
      .sort((a, b) => getOrder(a.metadata_json) - getOrder(b.metadata_json));
  }, [activatedCodes, allQuestions]);

  const currentGate = flowPhase === 'gates' ? orderedGates[gateIndex] : null;
  const currentQuestion = flowPhase === 'assessment' ? assessmentQuestions[assessmentIndex] : null;
  const TOTAL_GATES = orderedGates.length;
  const totalAssessmentQuestions = activatedCodes.length;

  // Initialize: load questions, then either resume an in-progress assessment
  // or create a fresh one (passing user JWT if logged in so the assessment
  // is owned from the start — fixes silent 403s on subsequent answer writes).
  useEffect(() => {
    const init = async () => {
      try {
        // Load questions + answer type options in parallel
        const [questionsData, optionsData] = await Promise.all([
          api.questions.getAll(),
          api.questions.getAnswerTypeOptions().catch(() => []),
        ]);
        const gates: GateData[] = [];
        const questions: QuestionData[] = [];
        for (const q of questionsData) {
          if (q.domain === 'gate') gates.push(q);
          else questions.push(q);
        }
        setAllGates(gates);
        setAllQuestions(questions);
        // Group options by answerType
        const optMap: Record<string, { value: string; labelEn: string; labelRo: string; score: number }[]> = {};
        for (const o of optionsData) {
          if (!optMap[o.answer_type ?? o.answerType]) optMap[o.answer_type ?? o.answerType] = [];
          optMap[o.answer_type ?? o.answerType].push({
            value: o.value,
            labelEn: o.label_en ?? o.labelEn,
            labelRo: o.label_ro ?? o.labelRo,
            score: Number(o.score),
          });
        }
        setAnswerTypeOptions(optMap);

        const orderedGatesLocal = [...gates].sort((a, b) => getOrder(a.metadata_json) - getOrder(b.metadata_json));

        // Check for existing assessment + try to resume from saved answers
        const savedId = localStorage.getItem(STORAGE_KEY_ID);
        const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const savedJwt = localStorage.getItem(STORAGE_KEY_JWT) ?? getSessionJwt();

        let resumed = false;
        if (savedId) {
          try {
            // Make sure the API client can authenticate this fetch — use saved
            // session JWT if we don't have a real user token.
            if (savedJwt && !getAccessToken()) setSessionJwt(savedJwt);

            const data = await api.assessments.getById(savedId);
            const assessment = (data as any).assessment ?? data;
            const answersList: { refType: string; refCode: string; valueJson: any }[] =
              (data as any).answers ?? [];

            if (assessment?.status === 'completed') {
              // Already done — clear localStorage and send to results.
              localStorage.removeItem(STORAGE_KEY_ID);
              localStorage.removeItem(STORAGE_KEY_TOKEN);
              localStorage.removeItem(STORAGE_KEY_JWT);
              clearSessionJwt();
              router.push(`/assessment/${savedId}/results`);
              return;
            }

            setAssessmentId(savedId);
            if (savedToken) setSessionToken(savedToken);
            if (savedJwt) setSessionJwtState(savedJwt);

            // Latest answer per refCode wins (answers are append-only)
            const latest = new Map<string, string>();
            for (const a of answersList) {
              const v = (a.valueJson as any)?.value;
              if (v !== undefined) latest.set(a.refCode, String(v));
            }

            // Replay gates in their canonical order
            const newGateAnswers = new Map<string, string>();
            let nextGateIdx = 0;
            for (let i = 0; i < orderedGatesLocal.length; i++) {
              const code = orderedGatesLocal[i].code;
              const v = latest.get(code);
              if (v !== undefined) {
                newGateAnswers.set(code, v);
                nextGateIdx = i + 1;
              } else {
                break;
              }
            }
            setGateAnswers(newGateAnswers);

            if (nextGateIdx < orderedGatesLocal.length) {
              // Some gates still to answer
              setGateIndex(nextGateIdx);
              setFlowPhase('gates');
              resumed = true;
            } else {
              // All gates answered → compute activated questions and resume there
              const { activated } = determineActiveQuestionsFromMap(
                newGateAnswers,
                toScoringGates(orderedGatesLocal),
              );
              const codes = questions
                .filter((q) => activated.has(q.code))
                .sort((a, b) => getOrder(a.metadata_json) - getOrder(b.metadata_json))
                .map((q) => q.code);
              setActivatedCodes(codes);

              let nextQIdx = 0;
              for (let i = 0; i < codes.length; i++) {
                if (latest.has(codes[i])) nextQIdx = i + 1;
                else break;
              }

              if (nextQIdx < codes.length) {
                setAssessmentIndex(nextQIdx);
                setFlowPhase('assessment');
              } else if (codes.length === 0) {
                // No questions activated by this profile — go directly to completion path
                setFlowPhase('account_gate');
              } else {
                // All questions answered too — fall into the same end-of-flow logic
                setFlowPhase(getAccessToken() ? 'calculating' : 'account_gate');
                if (getAccessToken()) {
                  try {
                    await api.assessments.complete(savedId);
                    localStorage.removeItem(STORAGE_KEY_ID);
                    localStorage.removeItem(STORAGE_KEY_TOKEN);
                    localStorage.removeItem(STORAGE_KEY_JWT);
                    clearSessionJwt();
                    router.push(`/assessment/${savedId}/results`);
                    return;
                  } catch {
                    setFlowPhase('account_gate');
                  }
                }
              }
              resumed = true;
            }
          } catch {
            // Resume failed (404 / 403 / network) — fall through to create a fresh one
            localStorage.removeItem(STORAGE_KEY_ID);
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_JWT);
            clearSessionJwt();
          }
        }

        if (!resumed) {
          // Create new assessment. The backend now attaches userId if a valid
          // user JWT is present in Authorization, so logged-in users own it from
          // the start.
          const result = await api.assessments.create(language as 'en' | 'ro');
          setAssessmentId(result.assessmentId);
          setSessionToken(result.sessionToken);
          setSessionJwtState(result.sessionJwt);
          localStorage.setItem(STORAGE_KEY_ID, result.assessmentId);
          localStorage.setItem(STORAGE_KEY_TOKEN, result.sessionToken);
          localStorage.setItem(STORAGE_KEY_JWT, result.sessionJwt);
          // Anonymous users: store session JWT in its own slot so request()
          // can use it as Bearer fallback (not in access_token).
          if (!getAccessToken()) setSessionJwt(result.sessionJwt);
          setFlowPhase('gates');
        }

        setTimeout(() => setShowContent(true), 100);
      } catch (err) {
        console.error('Failed to initialize assessment:', err);
        toast.error(language === 'ro' ? 'Nu am putut porni evaluarea. Reîncarcă pagina.' : 'Could not start the assessment. Please reload.');
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const getAnswerLabel = (value: string, item: GateData | QuestionData): string => {
    // 1. Per-question options_json takes precedence (multiple_choice)
    const perQOptions = parseOptions((item as any).options_json);
    if (perQOptions.length > 0) {
      const opt = perQOptions.find(o => o.value === value);
      if (opt) return language === 'en' ? opt.label_en : opt.label_ro;
    }
    // 2. DB-driven answer type options
    const typeOpts = answerTypeOptions[(item as any).answer_type] || [];
    const dbOpt = typeOpts.find(o => o.value === value);
    if (dbOpt) return language === 'en' ? dbOpt.labelEn : dbOpt.labelRo;
    // 3. Hardcoded fallback
    return value;
  };

  const handleGateAnswer = async (value: string) => {
    if (!currentGate || !assessmentId) return;
    setUserAnswer(getAnswerLabel(value, currentGate));

    try {
      await api.assessments.saveAnswer(assessmentId, {
        refType: 'GATE',
        refCode: currentGate.code,
        valueJson: { value },
      });
    } catch (err: any) {
      setUserAnswer(null);
      toast.error(
        language === 'ro'
          ? `Răspunsul nu s-a putut salva: ${err.message ?? 'eroare necunoscută'}`
          : `Could not save your answer: ${err.message ?? 'unknown error'}`,
      );
      return;
    }

    const newGateAnswers = new Map(gateAnswers);
    newGateAnswers.set(currentGate.code, value);
    setGateAnswers(newGateAnswers);

    await delay(600);
    setIsTransitioning(true);
    setShowContent(false);
    await delay(300);
    setUserAnswer(null);

    const nextGateIndex = gateIndex + 1;
    if (nextGateIndex >= TOTAL_GATES) {
      // Compute activated questions using the shared scoring engine function
      const { activated } = determineActiveQuestionsFromMap(newGateAnswers, toScoringGates(orderedGates));
      const codes = allQuestions
        .filter(q => activated.has(q.code))
        .sort((a, b) => getOrder(a.metadata_json) - getOrder(b.metadata_json))
        .map(q => q.code);
      setActivatedCodes(codes);
      setFlowPhase('transition');
      setIsTransitioning(false);
      await delay(100);
      setShowContent(true);
    } else {
      setGateIndex(nextGateIndex);
      setIsTransitioning(false);
      await delay(100);
      setShowContent(true);
    }
  };

  const handleAssessmentAnswer = async (value: string) => {
    if (!currentQuestion || !assessmentId) return;
    setUserAnswer(getAnswerLabel(value, currentQuestion));

    try {
      await api.assessments.saveAnswer(assessmentId, {
        refType: 'QUESTION',
        refCode: currentQuestion.code,
        valueJson: { value },
      });
    } catch (err: any) {
      setUserAnswer(null);
      toast.error(
        language === 'ro'
          ? `Răspunsul nu s-a putut salva: ${err.message ?? 'eroare necunoscută'}`
          : `Could not save your answer: ${err.message ?? 'unknown error'}`,
      );
      return;
    }

    await delay(600);
    setIsTransitioning(true);
    setShowContent(false);
    await delay(300);
    setUserAnswer(null);

    const nextIndex = assessmentIndex + 1;
    setAssessmentIndex(nextIndex);

    if (nextIndex >= totalAssessmentQuestions) {
      // All questions answered — branch on auth state.
      // Use access_token presence directly: /auth/me is no longer safe to call
      // here because the request layer would auto-redirect to /auth on 401 and
      // wipe the in-flight assessment context.
      const isAuthed = !!getAccessToken();
      if (isAuthed) {
        setFlowPhase('calculating');
        setShowContent(false);
        try {
          await api.assessments.complete(assessmentId);
          localStorage.removeItem(STORAGE_KEY_ID);
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_JWT);
          clearSessionJwt();
          await delay(500);
          router.push(`/assessment/${assessmentId}/results`);
        } catch (err: any) {
          toast.error(
            language === 'ro'
              ? `Nu am putut finaliza evaluarea: ${err.message ?? 'eroare necunoscută'}`
              : `Could not complete the assessment: ${err.message ?? 'unknown error'}`,
          );
          setFlowPhase('account_gate');
          setShowContent(true);
        }
      } else {
        setFlowPhase('account_gate');
        setShowContent(true);
      }
    } else {
      setIsTransitioning(false);
      await delay(100);
      setShowContent(true);
    }
  };

  const handleTransitionContinue = () => {
    setShowContent(false);
    setTimeout(() => {
      setAssessmentIndex(0);
      setFlowPhase('assessment');
      setShowContent(true);
    }, 200);
  };

  const finalizeAfterAuth = async () => {
    // Once a real user JWT is in place, claim + complete + redirect.
    setFlowPhase('calculating');
    setShowContent(false);
    if (assessmentId && sessionToken) {
      await api.assessments.claim(assessmentId, sessionToken);
    }
    await delay(800);
    if (assessmentId) {
      await api.assessments.complete(assessmentId);
    }
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_JWT);
    clearSessionJwt();
    await delay(400);
    router.push(`/assessment/${assessmentId}/results`);
  };

  const handleAccountSubmit = async (
    email: string,
    companyName: string,
    password: string,
    _consent: { termsAccepted: boolean; marketingConsent: boolean },
  ) => {
    setSignUpError(null);
    setIsAccountLoading(true);
    try {
      await api.auth.register({ email, password, companyName });
      await finalizeAfterAuth();
    } catch (err: any) {
      setSignUpError(err.message || 'Failed to create account');
      setIsAccountLoading(false);
      setFlowPhase('account_gate');
      setShowContent(true);
    }
  };

  const handleAccountSignIn = async (email: string, password: string) => {
    setSignUpError(null);
    setIsAccountLoading(true);
    try {
      await api.auth.login({ email, password });
      await finalizeAfterAuth();
    } catch (err: any) {
      setSignUpError(err.message || (language === 'ro' ? 'Autentificare eșuată' : 'Sign in failed'));
      setIsAccountLoading(false);
      setFlowPhase('account_gate');
      setShowContent(true);
    }
  };

  const getCategoryName = (): string | null => {
    if (flowPhase === 'gates') return t('progress.preliminary.title');
    if (flowPhase === 'assessment' && currentQuestion) {
      const names: Record<string, Record<string, string>> = {
        'risk.iam': { en: 'Identity & Access', ro: 'Identitate și Acces' },
        'risk.endpoint_device': { en: 'Endpoint Security', ro: 'Securitate Endpoint' },
        'risk.network_external': { en: 'Network Security', ro: 'Securitate Rețea' },
        'risk.backup_ransomware': { en: 'Backup & Recovery', ro: 'Backup și Recuperare' },
        'risk.monitoring_incident': { en: 'Monitoring & Incident', ro: 'Monitorizare și Incidente' },
        'risk.third_party_cloud': { en: 'Third-Party & Cloud', ro: 'Furnizori Terți și Cloud' },
        'maturity.governance_ownership': { en: 'Governance', ro: 'Guvernanță' },
        'maturity.policies_processes': { en: 'Policies & Processes', ro: 'Politici și Procese' },
        'maturity.awareness_human': { en: 'Security Awareness', ro: 'Conștientizare' },
        'maturity.asset_visibility': { en: 'Asset Visibility', ro: 'Vizibilitate Active' },
        'maturity.continuous_improvement': { en: 'Continuous Improvement', ro: 'Îmbunătățire Continuă' },
      };
      return names[currentQuestion.category]?.[language] || currentQuestion.category;
    }
    return null;
  };

  const getProgressInfo = () => {
    if (flowPhase === 'gates') {
      return { current: gateIndex + 1, total: TOTAL_GATES, progress: Math.round((gateIndex / Math.max(TOTAL_GATES, 1)) * 100), title: t('progress.preliminary.title') };
    }
    if (flowPhase === 'assessment') {
      return { current: assessmentIndex + 1, total: totalAssessmentQuestions, progress: Math.round((assessmentIndex / Math.max(totalAssessmentQuestions, 1)) * 100), title: t('progress.security.title') };
    }
    return { current: 0, total: 0, progress: 0, title: '' };
  };

  // Neutral, uniform styling for every answer option. Colors are intentionally
  // NOT derived from the value so the UI never hints which answer is "good".
  const ANSWER_BTN_CLASS =
    'flex-1 min-w-[140px] h-auto min-h-[52px] px-5 py-3 text-base font-medium whitespace-normal ' +
    'border border-border bg-card text-foreground ' +
    'hover:bg-primary/10 hover:border-primary hover:text-foreground hover:shadow-glow-sm ' +
    'active:scale-[0.98]';

  const renderOptionButtons = (
    opts: { value: string; label: string }[],
    handler: (v: string) => void,
  ) => (
    <div className="flex gap-3 justify-center flex-wrap">
      {opts.map(opt => (
        <Button
          key={opt.value}
          onClick={() => handler(opt.value)}
          variant="outline"
          className={ANSWER_BTN_CLASS}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );

  const renderButtons = (answerType: string, perQuestionOptions: any, handler: (v: string) => void) => {
    if (userAnswer || isTransitioning || !showContent) return null;

    // For multiple_choice: per-question options_json takes precedence, fall back to DB defaults
    if (answerType === 'multiple_choice') {
      const perQ = parseOptions(perQuestionOptions);
      const opts = perQ.length > 0
        ? perQ.map(o => ({ value: o.value, label: language === 'en' ? o.label_en : o.label_ro }))
        : (answerTypeOptions['multiple_choice'] || []).map(o => ({ value: o.value, label: language === 'en' ? o.labelEn : o.labelRo }));
      return renderOptionButtons(opts, handler);
    }

    // For all other types: use DB options, fall back to hardcoded if DB is empty
    const dbOpts = answerTypeOptions[answerType];
    if (dbOpts && dbOpts.length > 0) {
      return renderOptionButtons(
        dbOpts.map(opt => ({ value: opt.value, label: language === 'en' ? opt.labelEn : opt.labelRo })),
        handler,
      );
    }

    // Hardcoded fallback (safety net if DB is empty)
    if (answerType === 'yes_no') {
      return renderOptionButtons([
        { value: 'yes', label: language === 'en' ? 'Yes' : 'Da' },
        { value: 'no', label: language === 'en' ? 'No' : 'Nu' },
      ], handler);
    }
    if (answerType === 'yes_no_unsure') {
      return renderOptionButtons([
        { value: 'yes', label: language === 'en' ? 'Yes' : 'Da' },
        { value: 'no', label: language === 'en' ? 'No' : 'Nu' },
        { value: 'unsure', label: language === 'en' ? 'Not sure' : 'Nu știu' },
      ], handler);
    }
    if (answerType === 'scale') {
      return renderOptionButtons([
        { value: 'not_implemented', label: language === 'en' ? 'Not implemented' : 'Neimplementat' },
        { value: 'partially', label: language === 'en' ? 'Partially' : 'Parțial' },
        { value: 'fully', label: language === 'en' ? 'Fully' : 'Complet' },
      ], handler);
    }
    return null;
  };

  const isLoadingState = flowPhase === 'loading';
  const progressInfo = getProgressInfo();
  const showProgressBar = flowPhase === 'gates' || flowPhase === 'assessment';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-16 flex flex-col">
        {showProgressBar && (
          <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
            <div className="container mx-auto max-w-2xl">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">{t('progress.question').replace('{{current}}', String(progressInfo.current)).replace('{{total}}', String(progressInfo.total))}</span>
                <span className="text-primary font-medium">{progressInfo.progress}%</span>
              </div>
              <Progress value={progressInfo.progress} className="h-2" />
              <h2 className="mt-3 text-lg font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {progressInfo.title}
                {flowPhase === 'assessment' && currentQuestion && <span className="text-sm font-normal text-muted-foreground ml-2">— {getCategoryName()}</span>}
              </h2>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center px-4 py-8">
          <div className="container mx-auto max-w-2xl flex flex-col gap-4">
            {isLoadingState && (
              <div className="flex flex-col items-center justify-center gap-4 animate-fade-in py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Shield className="w-8 h-8 text-primary animate-pulse" /></div>
                <p className="text-muted-foreground">{t('assessment.welcome')}</p>
              </div>
            )}

            {flowPhase === 'calculating' && (
              <div className="flex flex-col items-center justify-center gap-4 animate-fade-in py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                <p className="text-muted-foreground">{t('assessment.calculating')}</p>
              </div>
            )}

            {flowPhase === 'transition' && <TransitionScreen onContinue={handleTransitionContinue} questionCount={totalAssessmentQuestions} animate={showContent} />}

            {flowPhase === 'account_gate' && (
              <AccountGate
                onSubmit={handleAccountSubmit}
                onSignIn={handleAccountSignIn}
                isLoading={isAccountLoading}
                error={signUpError}
              />
            )}

            {flowPhase === 'gates' && currentGate && !isLoadingState && (
              <div className={cn("transition-all duration-300 ease-out flex flex-col gap-4", showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
                <ChatMessage type="bot" size="lg" message={language === 'en' ? currentGate.text_en : currentGate.text_ro} animate={showContent && !isTransitioning} />
                {userAnswer && <ChatMessage type="user" message={userAnswer} animate={true} />}
              </div>
            )}

            {flowPhase === 'assessment' && currentQuestion && !isLoadingState && (
              <div className={cn("transition-all duration-300 ease-out flex flex-col gap-4", showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
                <ChatMessage type="bot" size="lg" message={language === 'en' ? currentQuestion.text_en : currentQuestion.text_ro} animate={showContent && !isTransitioning} />
                {userAnswer && <ChatMessage type="user" message={userAnswer} animate={true} />}
              </div>
            )}
          </div>
        </div>

        {flowPhase === 'gates' && currentGate && !isLoadingState && (
          <div className={cn("sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border/50 px-4 py-6 transition-opacity duration-200", (userAnswer || isTransitioning) && "opacity-50 pointer-events-none")}>
            <div className="container mx-auto max-w-2xl">
              {renderButtons(currentGate.answer_type, currentGate.options_json, handleGateAnswer)}
            </div>
          </div>
        )}

        {flowPhase === 'assessment' && currentQuestion && !isLoadingState && (
          <div className={cn("sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border/50 px-4 py-6 transition-opacity duration-200", (userAnswer || isTransitioning) && "opacity-50 pointer-events-none")}>
            <div className="container mx-auto max-w-2xl">
              {renderButtons(currentQuestion.answer_type, currentQuestion.options_json, handleAssessmentAnswer)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
