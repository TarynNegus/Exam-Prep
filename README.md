# ExamPrep

A subscription-based web platform that helps students prepare for **Cambridge IGCSE** and **Cambridge International AS & A Level** exams.

Each subject is broken into the content sections of its Cambridge syllabus. Students:

1. **Work through the syllabus topic by topic.** Topics unlock in syllabus order.
2. **Practise exam-style questions** taken from past papers and tagged by topic.
3. **Get feedback from the mark scheme and the examiner's report** after every answer.
4. **Sit full, timed past papers** once every topic is complete. Results are broken down by syllabus topic.

## How it works

### Content model

```
Subject (e.g. 0580 Mathematics, syllabus 2025-2027, IGCSE)
 ├─ Topic        syllabus content sections, in order; this is the learning path
 └─ Component    the assessed papers (Paper 2, Paper 4 …)
      └─ PastPaper   one exam series/variant
           └─ Question → QuestionPart
                          ├─ topic            which syllabus section it assesses
                          ├─ answerType       MULTIPLE_CHOICE | NUMERIC | SHORT_TEXT | EXTENDED
                          ├─ markingPoints    the mark scheme, e.g. "M1 for …", "A1 for …"
                          └─ examinerComment  commentary from the examiner's report
```

Every question part is tagged with a syllabus topic. The same past paper question is used in two places: in **topic practice** (only the parts for that topic are shown) and in **full past paper** mode.

### Marking

- **Multiple choice** is marked automatically.
- **Numeric** answers are marked automatically, within a tolerance, and accept forms like `1,250`, `3/4` and `12 cm`. If the final answer is wrong, the student checks their working against the mark scheme so they can still claim method marks.
- **Short text** is marked automatically when it matches an accepted answer. Otherwise it goes to self-marking.
- **Extended** written answers are self-marked: the student ticks each mark scheme point their answer meets.

After answering, the student always sees the answer, the mark scheme points and the examiner's report comment.

### Progress and unlocking (`src/lib/progress.ts`)

- A topic is **complete** when the student has answered at least 3 of its questions (or all of them, if it has fewer) with an overall score of at least 60%. The latest attempt at each question counts.
- **Paper combinations:** a subject can list the combinations of papers students may take (`routes` in the content file). 9709 offers Papers 1+2, 1+4 or 1+5 at AS Level, and 1+3+4+5 or 1+3+5+6 at A Level. IGCSE Chemistry, Physics and Mathematics offer Core and Extended tiers, and students only practise questions from their own papers. Students choose theirs when they add the subject and only see those topics and papers.
- Completing a topic unlocks the next one. Topics can be grouped into **sections** (for example one per 9709 paper), and each section unlocks independently, so students can follow the papers they are taking.
- **Full past papers** each unlock when every topic that paper assesses is complete. They require a subscription.
- **Free plan:** the first 2 topics of each section. **Subscription:** everything.

All of these thresholds are constants at the top of `src/lib/progress.ts`.

### Subscriptions

Billing uses Stripe Checkout, the Stripe customer portal and a webhook (`/api/stripe/webhook`) that keeps each user's subscription status in sync. When Stripe isn't configured in development, `DEV_FAKE_BILLING=true` lets the Subscribe button activate a plan without payment. This shortcut is always disabled in production.

## Tech stack

- **Next.js 15** (App Router, server actions) + **React 19** + **Tailwind CSS 4**
- **PostgreSQL** via **Prisma 6**
- Email and password authentication: bcrypt hashes and a signed, HTTP-only JWT session cookie (`jose`)
- **Stripe** for subscriptions
- **Vitest** for unit tests

## Getting started

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # set DATABASE_URL, DIRECT_URL and SESSION_SECRET
npm run db:setup                # create the tables and load every JSON file in /content
npm run dev                     # http://localhost:3000
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for marking, progress rules, and validation of all content files |
| `npm run lint` | TypeScript type check |
| `npm run build` | Production build |
| `npm run content:import -- path/to/file.json` | Import specific content files |

## Deploying: Supabase (database) + Vercel (website)

Supabase hosts the PostgreSQL database. The Next.js site itself runs on Vercel, which has a free tier and works directly with GitHub.

### 1. Create the Supabase database

1. Sign up at [supabase.com](https://supabase.com) and create a **New project**. Pick a region near your students and save the database password somewhere safe.
2. Open **Connect** (top of the project dashboard) and copy two connection strings, replacing `[YOUR-PASSWORD]` with your password:
   - **Transaction pooler** (port `6543`). Add `?pgbouncer=true&connection_limit=1` to the end. This is `DATABASE_URL`.
   - **Session pooler** (port `5432`). This is `DIRECT_URL`.

The app uses its own login system, so you don't need to set up Supabase Auth.

### 2. Create the tables and load the content

Either way works:

- **From GitHub (no local setup):** in the GitHub repository, open **Settings → Secrets and variables → Actions** and add `DATABASE_URL` and `DIRECT_URL` as repository secrets. Then open **Actions → Update database → Run workflow**. After that, the workflow runs on its own whenever `main` changes the database schema or anything in `/content`.
- **From your computer:** put both strings in `.env` and run `npm run db:setup`.

### 3. Put the website on Vercel

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account and **Import** this repository. Vercel detects Next.js automatically.
2. Under **Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the Supabase transaction pooler string (port 6543) |
   | `DIRECT_URL` | the Supabase session pooler string (port 5432) |
   | `SESSION_SECRET` | a long random string, e.g. from `openssl rand -base64 32` |
   | `APP_URL` | your site address, e.g. `https://exam-prep.vercel.app` |
   | `STRIPE_*` | your Stripe keys (see below) |

3. Click **Deploy**. Every push to `main` then redeploys the site.

`DEV_FAKE_BILLING` never works in production, so subscriptions on the live site need Stripe set up.

### Setting up Stripe

1. Create a product with a monthly and an annual recurring price. Put the price ids in `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL`.
2. Set `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` for these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. For local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Adding content

Content lives in `/content`, one JSON file per subject syllabus. The format is defined and validated in `src/lib/content-schema.ts`. Importing is idempotent: re-importing a file updates content in place and keeps students' answers.

```jsonc
{
  "subject":    { "code": "0580", "name": "Mathematics", "qualification": "IGCSE", "syllabusYears": "2025-2027" },
  "topics":     [{ "ref": "1", "title": "Number", "summary": "…", "section": "" }],  // section is optional
  "components": [{ "ref": "4", "title": "Paper 4 (Extended, calculator)", "durationMin": 120, "totalMarks": 100 }],
  "papers": [{
    "component": "4", "series": "June 2024", "variant": "42", "title": "June 2024 Paper 42",
    "questions": [{
      "number": 1, "stem": "Shared context for all parts",
      "parts": [{
        "label": "(a)", "topic": "1", "prompt": "…", "marks": 2,
        "answerType": "NUMERIC", "correctAnswer": "2835.69", "tolerance": 0.01,
        "markingPoints": [{ "text": "M1 for 2500 × 1.032^4", "marks": 1 }, { "text": "A1 for 2835.69", "marks": 1 }],
        "examinerComment": "Common errors were …"
      }]
    }]
  }]
}
```

### Converting licensed Cambridge papers

Once you have permission from Cambridge, a question paper, its mark scheme and its examiner report can be converted with Claude instead of being typed in by hand. You need an `ANTHROPIC_API_KEY` in `.env`.

```bash
npm run content:convert -- \
  --subject content/igcse-0610-biology.json --component 2 --series "June 2024" --variant 22 \
  --paper 0610_s24_qp_22.pdf --mark-scheme 0610_s24_ms_22.pdf --examiner-report 0610_s24_er.pdf
```

This writes a draft to `content/drafts/`. The draft's `review` section lists parts that were skipped because they need a diagram, points Claude was unsure about, and validation problems. Check the draft against the PDFs, then add it to the subject:

```bash
npm run content:merge -- content/drafts/0610-june-2024-22.json
npm run content:import
```

Each conversion is one Claude API request using Claude Opus 5.5. It typically costs about $1–3 per paper, depending on how many pages the three PDFs have.

The content tests (`tests/content.test.ts`) run on every file in `/content`. They check that each mark scheme covers the part's marks and that each auto-marked part accepts its own model answer.

## ⚠️ Licensing of Cambridge material

Cambridge past papers, mark schemes, examiner reports and syllabus documents are **copyright of Cambridge University Press & Assessment**. Using them in a commercial, subscription product needs **written permission or a licence from Cambridge**. Do not import real past paper content until you have that permission.

The sample content in `/content` (IGCSE 0460 Geography, 0500 First Language English, 0580 Mathematics, 0610 Biology, 0620 Chemistry and 0625 Physics; AS & A Level 9702 Physics and 9709 Mathematics) is made of **original practice questions written in the Cambridge style**. It contains no reproduced past paper material, and the sample papers are labelled "illustrative". Topic headings follow the published syllabus structure. Check them against the current syllabus documents before launch.

The site footer states that the product is not affiliated with or endorsed by Cambridge.

## Project layout

```
content/                 subject content (JSON)
prisma/                  database schema and migrations
scripts/import-content.ts
src/
  app/                   pages: landing, auth, dashboard, subjects, practice, papers, attempts, billing
  app/api/stripe/webhook Stripe webhook
  components/            UI: answer input, feedback panel, timed exam, etc.
  lib/
    marking.ts           pure marking logic
    progress.ts          pure progress, unlocking and plan rules
    subject-progress.ts  loads a student's progress for a subject
    *-actions.ts         server actions (auth, practice, papers, billing, enrolment)
tests/                   Vitest unit tests
```

## Roadmap ideas

- **AI-assisted marking** of written answers against the mark scheme, using the Claude API, alongside self-marking
- An admin interface for content authors, and PDF-to-JSON import tooling for licensed past papers
- Images and diagrams in questions; LaTeX/maths rendering
- Spaced-repetition review of weak topics, and grade estimates using published grade thresholds
- Teacher and school accounts with class progress dashboards
- Email verification and password reset
