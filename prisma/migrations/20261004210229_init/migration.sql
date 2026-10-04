-- CreateEnum
CREATE TYPE "Qualification" AS ENUM ('IGCSE', 'AS_A_LEVEL');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('MULTIPLE_CHOICE', 'NUMERIC', 'SHORT_TEXT', 'EXTENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('PRACTICE', 'FULL_PAPER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "stripeCustomerId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "subscriptionPlan" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualification" "Qualification" NOT NULL,
    "syllabusYears" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaper" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "PastPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "stem" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPart" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "answerType" "AnswerType" NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "tolerance" DOUBLE PRECISION,
    "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "markingPoints" JSONB NOT NULL,
    "examinerComment" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "QuestionPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "paperAttemptId" TEXT,
    "response" TEXT NOT NULL,
    "awardedMarks" INTEGER NOT NULL,
    "selfMarked" BOOLEAN NOT NULL DEFAULT false,
    "pendingReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "PaperAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_syllabusYears_key" ON "Subject"("code", "syllabusYears");

-- CreateIndex
CREATE INDEX "Topic_subjectId_position_idx" ON "Topic"("subjectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subjectId_ref_key" ON "Topic"("subjectId", "ref");

-- CreateIndex
CREATE UNIQUE INDEX "Component_subjectId_ref_key" ON "Component"("subjectId", "ref");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaper_componentId_series_variant_key" ON "PastPaper"("componentId", "series", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "Question_paperId_number_key" ON "Question"("paperId", "number");

-- CreateIndex
CREATE INDEX "QuestionPart_topicId_idx" ON "QuestionPart"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPart_questionId_position_key" ON "QuestionPart"("questionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Enrolment_userId_subjectId_key" ON "Enrolment"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "Answer_userId_partId_createdAt_idx" ON "Answer"("userId", "partId", "createdAt");

-- CreateIndex
CREATE INDEX "PaperAttempt_userId_paperId_idx" ON "PaperAttempt"("userId", "paperId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaper" ADD CONSTRAINT "PastPaper_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PastPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPart" ADD CONSTRAINT "QuestionPart_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPart" ADD CONSTRAINT "QuestionPart_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_partId_fkey" FOREIGN KEY ("partId") REFERENCES "QuestionPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_paperAttemptId_fkey" FOREIGN KEY ("paperAttemptId") REFERENCES "PaperAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAttempt" ADD CONSTRAINT "PaperAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAttempt" ADD CONSTRAINT "PaperAttempt_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PastPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
