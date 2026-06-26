# CyberXscore

**CyberXscore** este o platformă web de autoevaluare a posturii de securitate cibernetică,
destinată întreprinderilor mici și mijlocii. Aplicația ghidează utilizatorul printr-un
chestionar interactiv, în stil conversațional, și produce un scor între 0 și 99, împărțit
în două domenii: **Risc** (maxim 60 de puncte) și **Maturitate** (maxim 40 de puncte).
Interfața este bilingvă (română / engleză).

## Cuprins

- [Funcționalități](#funcționalități)
- [Arhitectură](#arhitectură)
- [Tehnologii](#tehnologii)
- [Structura proiectului](#structura-proiectului)
- [Motorul de scoring](#motorul-de-scoring)
- [Instalare și rulare](#instalare-și-rulare)
- [Variabile de mediu](#variabile-de-mediu)
- [Rulare cu Docker](#rulare-cu-docker)

## Funcționalități

- Chestionar adaptiv: întrebările afișate depind de răspunsurile la întrebările preliminare
  („gate-uri"), astfel încât fiecare organizație primește un set relevant de întrebări.
- Scor calculat pe server, cu defalcare pe 11 categorii (6 de risc, 5 de maturitate).
- Flux anonim: o evaluare poate fi începută fără cont și revendicată ulterior, la crearea contului.
- Pagină de rezultate cu recomandări și posibilitatea de partajare printr-un link public.
- Istoric al evaluărilor pentru utilizatorii autentificați.
- Panou de administrare pentru gestionarea întrebărilor versionate, categoriilor de scor,
  regulilor de activare, deduplicării și jurnalelor de audit.
- Autentificare pe bază de token-uri JWT (acces + reîmprospătare), cu parole stocate ca hash bcrypt.

## Arhitectură

```
Internet → Nginx (proxy invers) ┬→ Next.js  (interfața web)
                                ├→ NestJS   (API REST)
                                └→ PostgreSQL (bază de date, doar rețea internă)
```

Aplicația este organizată ca un monorepo cu trei pachete: interfața web, API-ul și un pachet
partajat care conține motorul de scoring. Pachetul de scoring este importat atât de API
(pentru calculul propriu-zis), cât și de interfață (pentru funcțiile de afișare), garantând
o singură sursă de adevăr pentru logica de calcul.

## Tehnologii

| Strat | Tehnologie |
|---|---|
| Interfață | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| API | NestJS 10, Prisma ORM |
| Bază de date | PostgreSQL 15 |
| Autentificare | Passport JWT (token de acces + token de reîmprospătare, cookie httpOnly) |
| Scoring | Pachet TypeScript partajat (`@cyberxscore/scoring`) |
| Monorepo | npm workspaces |
| Containerizare | Docker, Docker Compose |

## Structura proiectului

```
/
├── apps/
│   ├── web/                 # Aplicația Next.js (interfața)
│   │   ├── app/             # Pagini (landing, autentificare, evaluare, rezultate, istoric, admin)
│   │   ├── components/      # Componente React reutilizabile
│   │   ├── contexts/        # Context de limbă (RO/EN) și provideri
│   │   ├── lib/             # Client API tipat și utilitare
│   │   └── middleware.ts    # Protecția rutelor
│   │
│   └── api/                 # Aplicația NestJS (API REST)
│       ├── src/
│       │   ├── auth/        # Înregistrare, autentificare, resetare parolă
│       │   ├── assessment/  # Creare, răspuns, finalizare, rezultate, istoric
│       │   ├── questions/   # Întrebările active curente
│       │   ├── share/       # Linkuri de partajare
│       │   ├── admin/       # Administrare (întrebări, categorii, audit, deduplicare)
│       │   └── common/      # Guards, decoratori, filtre, e-mail
│       └── prisma/          # Schema bazei de date și datele inițiale
│
└── packages/
    └── scoring/             # Motorul de scoring (TypeScript pur, fără dependențe externe)
```

## Motorul de scoring

Funcția centrală `calculateScore(answers, gates, questions, dedupeResolution?)` returnează un
obiect `ScoreResult`. Modelul de calcul cuprinde:

- 11 categorii (6 de risc, 5 de maturitate), agregate într-un scor global de la 0 la 99;
- multiplicatori de categorie și efecte (plafoane, penalizări, anulare la zero) determinate de
  răspunsurile la gate-uri;
- gate-uri critice care, la eșec, limitează scorul final;
- plafoane fixe pentru situații de risc ridicat (de exemplu, lipsa unei strategii de backup).

Pentru că este o funcție pură, motorul de scoring poate fi testat independent și produce
rezultate identice pe server și în interfață.

## Instalare și rulare

Cerințe: Node.js 20+ și PostgreSQL 15+.

```bash
# Instalează dependențele pentru toate pachetele
npm install

# Configurează variabilele de mediu
cp .env.example .env   # editează cu datele de conexiune la baza de date

# Generează clientul Prisma
npm run prisma:generate

# Aplică schema bazei de date
npm run prisma:migrate

# Populează datele inițiale
npm run seed

# Pornește serverele de dezvoltare
npm run dev:api   # API NestJS pe portul 3001
npm run dev       # Interfața Next.js pe portul 3000
```

## Variabile de mediu

Lista completă se află în `.env.example`. Cele mai importante:

- `DATABASE_URL` — șirul de conexiune la PostgreSQL;
- `JWT_SECRET` / `ANONYMOUS_JWT_SECRET` — secrete separate pentru token-urile de utilizator și cele anonime;
- `SUPER_ADMIN_EMAILS` — lista de adrese cu drepturi de administrator;
- `NEXT_PUBLIC_API_URL` — adresa API-ului folosită din browser;
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — configurarea trimiterii de e-mailuri.

## Rulare cu Docker

```bash
# Pornește toate serviciile (interfață, API, bază de date, proxy)
docker compose up -d --build

# Verifică starea containerelor
docker compose ps
```

Doar serviciul Nginx este expus în exterior; baza de date, API-ul și interfața comunică pe o
rețea internă.
