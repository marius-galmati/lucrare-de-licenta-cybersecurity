'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ro';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.assessment': 'Assessment',
    'nav.results': 'Results',
    'nav.about': 'About',
    'common.start': 'Start Assessment',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.partial': 'Partially',
    'common.notApplicable': 'Not Applicable',
    'common.exportPdf': 'Export PDF',
    'common.share': 'Share Results',
    'common.copied': 'Link copied!',
    'landing.hero.title': 'Know Your Cyber Risk',
    'landing.hero.subtitle': 'Get a clear, actionable cybersecurity score for your business in minutes. No technical expertise required.',
    'landing.hero.cta': 'Start Free Assessment',
    'landing.hero.tagline': 'Trusted by SMBs worldwide',
    'landing.features.title': 'Why CyberXscore?',
    'landing.features.simple.title': 'Simple & Fast',
    'landing.features.simple.desc': 'Complete your assessment in under 15 minutes with our guided chat interface.',
    'landing.features.actionable.title': 'Actionable Insights',
    'landing.features.actionable.desc': 'Get clear recommendations tailored to your business risk profile.',
    'landing.features.transparent.title': 'Transparent Scoring',
    'landing.features.transparent.desc': 'Understand exactly how your score is calculated. No black boxes.',
    'landing.cta.title': 'Ready to assess your cyber risk?',
    'landing.cta.subtitle': 'Join thousands of businesses taking control of their cybersecurity.',
    'progress.preliminary.title': 'Preliminary Assessment',
    'progress.security.title': 'Security Assessment',
    'progress.question': 'Question {{current}} of {{total}}',
    'transition.title': 'Assessment personalized for your organization',
    'transition.body': 'Based on your answers, we\'ve selected the most relevant questions.',
    'transition.cta': 'Start Security Assessment',
    'answer.reused': 'Answered in Preliminary Assessment',
    'answers.title': 'Your Answers',
    'answers.securitySection': 'Security Assessment Answers',
    'answers.preliminarySection': 'Scored Preliminary Answers',
    'answers.usedForScoring': 'Used for scoring',
    'answers.viewButton': 'View your answers',
    'assessment.welcome': 'Welcome to your cybersecurity assessment',
    'assessment.intro': 'I\'ll guide you through a series of questions about your organization\'s security practices. Your answers help us calculate your CyberXscore.',
    'assessment.category.access': 'Access Control',
    'assessment.category.data': 'Data Protection',
    'assessment.category.network': 'Network Security',
    'assessment.category.awareness': 'Security Awareness',
    'assessment.category.incident': 'Incident Response',
    'assessment.category.backup': 'Backup & Recovery',
    'assessment.progress': 'Question {{current}} of {{total}}',
    'assessment.calculating': 'Calculating your CyberXscore...',
    'results.title': 'Your CyberXscore',
    'results.score': 'Score',
    'results.level.critical': 'Critical Risk',
    'results.level.high': 'High Risk',
    'results.level.medium': 'Medium Risk',
    'results.level.low': 'Low Risk',
    'results.level.excellent': 'Excellent',
    'results.breakdown': 'Score Breakdown',
    'results.recommendations': 'Recommendations',
    'results.priority.high': 'High Priority',
    'results.priority.medium': 'Medium Priority',
    'results.priority.low': 'Low Priority',
    'footer.powered': 'Developed by',
    'footer.partnership': 'in partnership with',
    'footer.ubb': 'Babeș-Bolyai University',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
  },
  ro: {
    'nav.home': 'Acasă',
    'nav.assessment': 'Evaluare',
    'nav.results': 'Rezultate',
    'nav.about': 'Despre',
    'common.start': 'Începe Evaluarea',
    'common.continue': 'Continuă',
    'common.back': 'Înapoi',
    'common.next': 'Următorul',
    'common.submit': 'Trimite',
    'common.yes': 'Da',
    'common.no': 'Nu',
    'common.partial': 'Parțial',
    'common.notApplicable': 'Nu se aplică',
    'common.exportPdf': 'Exportă PDF',
    'common.share': 'Partajează Rezultatele',
    'common.copied': 'Link copiat!',
    'landing.hero.title': 'Cunoaște-ți Riscul Cibernetic',
    'landing.hero.subtitle': 'Obține un scor clar și acționabil de securitate cibernetică pentru afacerea ta în câteva minute. Nu necesită expertiză tehnică.',
    'landing.hero.cta': 'Începe Evaluarea Gratuită',
    'landing.hero.tagline': 'De încredere pentru IMM-uri din întreaga lume',
    'landing.features.title': 'De ce CyberXscore?',
    'landing.features.simple.title': 'Simplu & Rapid',
    'landing.features.simple.desc': 'Completează evaluarea în mai puțin de 15 minute cu interfața noastră ghidată.',
    'landing.features.actionable.title': 'Recomandări Acționabile',
    'landing.features.actionable.desc': 'Primește recomandări clare adaptate profilului de risc al afacerii tale.',
    'landing.features.transparent.title': 'Scor Transparent',
    'landing.features.transparent.desc': 'Înțelege exact cum este calculat scorul tău. Fără cutii negre.',
    'landing.cta.title': 'Ești pregătit să îți evaluezi riscul cibernetic?',
    'landing.cta.subtitle': 'Alătură-te miilor de afaceri care își controlează securitatea cibernetică.',
    'progress.preliminary.title': 'Evaluare Preliminară',
    'progress.security.title': 'Evaluare de Securitate',
    'progress.question': 'Întrebarea {{current}} din {{total}}',
    'transition.title': 'Chestionar personalizat pentru organizația ta',
    'transition.body': 'Pe baza răspunsurilor tale, am selectat cele mai relevante întrebări.',
    'transition.cta': 'Începe evaluarea de securitate',
    'answer.reused': 'Răspuns preluat din Evaluarea Preliminară',
    'answers.title': 'Răspunsurile Tale',
    'answers.securitySection': 'Răspunsuri Evaluare de Securitate',
    'answers.preliminarySection': 'Răspunsuri Preliminare Punctate',
    'answers.usedForScoring': 'Folosit la scor',
    'answers.viewButton': 'Vezi răspunsurile',
    'assessment.welcome': 'Bine ai venit la evaluarea de securitate cibernetică',
    'assessment.intro': 'Te voi ghida printr-o serie de întrebări despre practicile de securitate ale organizației tale. Răspunsurile tale ne ajută să calculăm CyberXscore-ul tău.',
    'assessment.category.access': 'Controlul Accesului',
    'assessment.category.data': 'Protecția Datelor',
    'assessment.category.network': 'Securitatea Rețelei',
    'assessment.category.awareness': 'Conștientizare Securitate',
    'assessment.category.incident': 'Răspuns la Incidente',
    'assessment.category.backup': 'Backup & Recuperare',
    'assessment.progress': 'Întrebarea {{current}} din {{total}}',
    'assessment.calculating': 'Se calculează CyberXscore-ul tău...',
    'results.title': 'CyberXscore-ul Tău',
    'results.score': 'Scor',
    'results.level.critical': 'Risc Critic',
    'results.level.high': 'Risc Ridicat',
    'results.level.medium': 'Risc Mediu',
    'results.level.low': 'Risc Scăzut',
    'results.level.excellent': 'Excelent',
    'results.breakdown': 'Defalcare Scor',
    'results.recommendations': 'Recomandări',
    'results.priority.high': 'Prioritate Ridicată',
    'results.priority.medium': 'Prioritate Medie',
    'results.priority.low': 'Prioritate Scăzută',
    'footer.powered': 'Dezvoltat de',
    'footer.partnership': 'în parteneriat cu',
    'footer.ubb': 'Universitatea Babeș-Bolyai',
    'footer.privacy': 'Politica de Confidențialitate',
    'footer.terms': 'Termeni și Condiții',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : undefined;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = getCookie('lang') as Language | undefined;
    if (saved && (saved === 'en' || saved === 'ro')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setCookie('lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
