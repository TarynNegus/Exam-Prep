-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "figures" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "QuestionPart" ADD COLUMN     "figures" JSONB NOT NULL DEFAULT '[]';
