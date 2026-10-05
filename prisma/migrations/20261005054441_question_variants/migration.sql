-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "variantSeed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PaperAttempt" ADD COLUMN     "componentId" TEXT,
ADD COLUMN     "questionIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "seed" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "paperId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuestionPart" ADD COLUMN     "answerExpression" TEXT,
ADD COLUMN     "relativeTolerance" DOUBLE PRECISION,
ADD COLUMN     "variables" JSONB NOT NULL DEFAULT '{}';

-- AddForeignKey
ALTER TABLE "PaperAttempt" ADD CONSTRAINT "PaperAttempt_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;
