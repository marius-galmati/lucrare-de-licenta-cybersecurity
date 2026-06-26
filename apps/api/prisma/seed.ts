import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Populează perechile de dedupe (date inițiale canonice)
  const dedupePairs = [
    { gateCode: 'G1', questionCode: 'Q7' },
    { gateCode: 'G4', questionCode: 'Q20' },
    { gateCode: 'G7', questionCode: 'Q33' },
    { gateCode: 'G10', questionCode: 'Q53' },
  ];

  for (const pair of dedupePairs) {
    await prisma.dedupePair.upsert({
      where: { gateCode: pair.gateCode },
      update: {},
      create: {
        gateCode: pair.gateCode,
        questionCode: pair.questionCode,
        status: 'active',
      },
    });
    console.log(`  Dedupe pair: ${pair.gateCode} → ${pair.questionCode}`);
  }

  // Populează categoriile de scoring (date inițiale canonice, derivate din constantele din engine.ts)
  const scoringCategories = [
    { key: 'risk.iam',                      domain: 'risk',     maxPoints: 15, nameEn: 'Identity & Access Management',   nameRo: 'Identitate și Control Acces',           sortOrder: 0  },
    { key: 'risk.endpoint_device',          domain: 'risk',     maxPoints: 12, nameEn: 'Endpoint & Device Security',      nameRo: 'Securitate Endpoint și Dispozitive',    sortOrder: 1  },
    { key: 'risk.network_external',         domain: 'risk',     maxPoints: 10, nameEn: 'Network & External Security',     nameRo: 'Securitate Rețea și Externă',           sortOrder: 2  },
    { key: 'risk.backup_ransomware',        domain: 'risk',     maxPoints: 13, nameEn: 'Backup & Ransomware Protection',  nameRo: 'Backup și Protecție Ransomware',        sortOrder: 3  },
    { key: 'risk.monitoring_incident',      domain: 'risk',     maxPoints: 6,  nameEn: 'Monitoring & Incident Response',  nameRo: 'Monitorizare și Răspuns la Incidente',  sortOrder: 4  },
    { key: 'risk.third_party_cloud',        domain: 'risk',     maxPoints: 4,  nameEn: 'Third-Party & Cloud',             nameRo: 'Furnizori Terți și Cloud',              sortOrder: 5  },
    { key: 'maturity.governance_ownership', domain: 'maturity', maxPoints: 10, nameEn: 'Governance & Ownership',          nameRo: 'Guvernanță și Responsabilitate',        sortOrder: 6  },
    { key: 'maturity.policies_processes',   domain: 'maturity', maxPoints: 8,  nameEn: 'Policies & Processes',            nameRo: 'Politici și Procese',                   sortOrder: 7  },
    { key: 'maturity.awareness_human',      domain: 'maturity', maxPoints: 8,  nameEn: 'Security Awareness',              nameRo: 'Conștientizare Securitate',             sortOrder: 8  },
    { key: 'maturity.asset_visibility',     domain: 'maturity', maxPoints: 6,  nameEn: 'Asset Visibility',                nameRo: 'Vizibilitate Active',                   sortOrder: 9  },
    { key: 'maturity.continuous_improvement', domain: 'maturity', maxPoints: 8, nameEn: 'Continuous Improvement',         nameRo: 'Îmbunătățire Continuă',                 sortOrder: 10 },
  ];

  for (const cat of scoringCategories) {
    await prisma.scoringCategory.upsert({
      where: { key: cat.key },
      update: {},
      create: cat,
    });
    console.log(`  Scoring category: ${cat.key}`);
  }

  console.log('Seeding complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Seed error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
