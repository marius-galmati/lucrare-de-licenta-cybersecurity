// Gate-uri CyberXscore - configurația bilingvă canonică
import { Gate } from './engine';

export const gates: Gate[] = [
  {
    id: 'G1',
    code: 'G1',
    type: 'yes_no',
    text: {
      ro: 'Există o persoană clar responsabilă pentru securitatea cibernetică (chiar dacă nu este CISO)?',
      en: 'Is there a clearly responsible person for cybersecurity (even if not a CISO)?',
    },
    order: 1,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q3', 'Q4', 'Q6'],
        skipQuestions: ['Q7'],
      },
      {
        condition: 'no',
        activateQuestions: ['Q1', 'Q2', 'Q3', 'Q6', 'Q8', 'Q7'],
        flags: { governance_maturity: 'low' },
      },
    ],
  },
  {
    id: 'G2',
    code: 'G2',
    type: 'yes_no',
    text: {
      ro: 'Conturile administrative sunt folosite zilnic pentru activități uzuale (email, browsing)?',
      en: 'Are administrative accounts used daily for routine activities (email, browsing)?',
    },
    order: 2,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q11', 'Q14', 'Q15', 'Q16', 'Q30', 'Q32'],
        categoryMultipliers: {
          'risk.iam': 1.4,
          'risk.endpoint_device': 1.25,
        },
      },
      {
        condition: 'no',
        activateQuestions: ['Q10', 'Q13', 'Q15'],
      },
    ],
  },
  {
    id: 'G3',
    code: 'G3',
    type: 'yes_no',
    text: {
      ro: 'Există acces remote către infrastructura internă (VPN, RDP, cloud admin)?',
      en: 'Is there remote access to internal infrastructure (VPN, RDP, cloud admin)?',
    },
    order: 3,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q21', 'Q26', 'Q27', 'Q46'],
      },
      {
        condition: 'no',
        setNA: ['remote_access_block'],
      },
    ],
  },
  {
    id: 'G4',
    code: 'G4',
    type: 'multiple_choice',
    text: {
      ro: 'Există servicii expuse direct din rețeaua internă către Internet?',
      en: 'Are there services exposed directly from the internal network to the Internet?',
    },
    options: [
      { value: 'none', label: { ro: 'Nu există', en: 'None' } },
      { value: 'few', label: { ro: 'Puține', en: 'Few' } },
      { value: 'many', label: { ro: 'Multe', en: 'Many' } },
      { value: 'dont_know', label: { ro: 'Nu știu', en: "Don't know" } },
    ],
    order: 4,
    rules: [
      {
        condition: 'none',
        skipQuestions: ['Q22', 'Q23'],
      },
      {
        condition: 'few',
        activateQuestions: ['Q17', 'Q22', 'Q23', 'Q26', 'Q46'],
        categoryMultipliers: { 'risk.network_external': 1.1 },
      },
      {
        condition: 'many',
        activateQuestions: ['Q17', 'Q22', 'Q23', 'Q26', 'Q46'],
        categoryMultipliers: { 'risk.network_external': 1.25 },
      },
      {
        condition: 'dont_know',
        activateQuestions: ['Q17', 'Q22', 'Q23', 'Q26', 'Q46'],
        categoryMultipliers: { 'risk.network_external': 1.35 },
        flags: { implicit_risk: true },
      },
    ],
  },
  {
    id: 'G5',
    code: 'G5',
    type: 'yes_no',
    text: {
      ro: 'Angajații folosesc laptopuri sau dispozitive mobile pentru muncă?',
      en: 'Do employees use laptops or mobile devices for work?',
    },
    order: 5,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q25', 'Q26', 'Q27', 'Q29', 'Q31', 'Q18'],
      },
      {
        condition: 'no',
        setNA: ['Q27', 'Q31', 'mobile_controls_block'],
      },
    ],
  },
  {
    id: 'G6',
    code: 'G6',
    type: 'yes_no',
    text: {
      ro: 'Utilizatorii au drepturi locale de administrator pe stațiile lor?',
      en: 'Do users have local administrator rights on their workstations?',
    },
    order: 6,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q30', 'Q32', 'Q26'],
      },
      {
        condition: 'no',
        flags: { endpoint_maturity: 'above_average' },
      },
    ],
  },
  {
    id: 'G7',
    code: 'G7',
    type: 'yes_no',
    text: {
      ro: 'Există backup regulat pentru datele critice?',
      en: 'Is there regular backup for critical data?',
    },
    order: 7,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q33', 'Q34', 'Q35', 'Q36', 'Q38', 'Q39'],
      },
      {
        condition: 'no',
        activateQuestions: ['Q33'],
        effects: {
          backup_score_force_zero: true,
          final_score_cap: 55,
        },
      },
    ],
  },
  {
    id: 'G8',
    code: 'G8',
    type: 'yes_no_unsure',
    text: {
      ro: 'A existat vreun incident de securitate în ultimele 12–24 luni?',
      en: 'Has there been any security incident in the last 12–24 months?',
    },
    order: 8,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q27', 'Q29', 'Q45', 'Q41', 'Q43'],
      },
      {
        condition: 'no',
        activateQuestions: [],
      },
      {
        condition: 'unsure',
        activateQuestions: ['Q40', 'Q26', 'Q46'],
        effects: { monitoring_effectiveness_cap_within_category: 0.5 },
      },
    ],
  },
  {
    id: 'G9',
    code: 'G9',
    type: 'yes_no',
    text: {
      ro: 'Angajații primesc orice formă de instruire privind securitatea cibernetică?',
      en: 'Do employees receive any form of cybersecurity training?',
    },
    order: 9,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q47', 'Q48', 'Q50', 'Q51'],
      },
      {
        condition: 'no',
        activateQuestions: ['Q47', 'Q48'],
        skipQuestions: ['Q50'],
        effects: { final_score_penalty: -4 },
      },
    ],
  },
  {
    id: 'G10',
    code: 'G10',
    type: 'yes_no',
    text: {
      ro: 'Există furnizori terți cu acces la sistemele sau datele companiei?',
      en: 'Are there third-party vendors with access to company systems or data?',
    },
    order: 10,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q53', 'Q54', 'Q55', 'Q56', 'Q58', 'Q59', 'Q60'],
      },
      {
        condition: 'no',
        setNA: ['third_party_block'],
      },
    ],
  },
  {
    id: 'G11',
    code: 'G11',
    type: 'yes_no',
    text: {
      ro: 'Sunt utilizate servicii cloud (email, storage, ERP, CRM)?',
      en: 'Are cloud services used (email, storage, ERP, CRM)?',
    },
    order: 11,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q57', 'Q11', 'Q26'],
      },
      {
        condition: 'no',
        setNA: ['cloud_block'],
      },
    ],
  },
  {
    id: 'G12',
    code: 'G12',
    type: 'yes_no',
    text: {
      ro: 'Există o evidență clară a dispozitivelor și sistemelor IT utilizate?',
      en: 'Is there a clear inventory of IT devices and systems in use?',
    },
    order: 12,
    rules: [
      {
        condition: 'yes',
        activateQuestions: ['Q29', 'Q26'],
      },
      {
        condition: 'no',
        activateQuestions: ['Q20', 'Q29'],
      },
    ],
  },
  {
    id: 'G13',
    code: 'G13',
    type: 'yes_no',
    text: {
      ro: 'Organizația depinde critic de IT pentru operațiuni (downtime = impact major)?',
      en: 'Does the organization critically depend on IT operations (downtime = major impact)?',
    },
    order: 13,
    rules: [
      {
        condition: 'yes',
        categoryMultipliers: {
          'risk.backup_ransomware': 1.15,
          'risk.monitoring_incident': 1.15,
          'risk.network_external': 1.15,
        },
      },
      {
        condition: 'no',
        // Fără efecte suplimentare
      },
    ],
  },
];

export const getGateById = (id: string): Gate | undefined => {
  return gates.find(g => g.id === id || g.code === id);
};

export const getGatesInOrder = (): Gate[] => {
  return [...gates].sort((a, b) => a.order - b.order);
};
