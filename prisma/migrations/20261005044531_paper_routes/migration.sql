-- AlterTable
ALTER TABLE "Component" ADD COLUMN     "section" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Enrolment" ADD COLUMN     "routeId" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "routes" JSONB NOT NULL DEFAULT '[]';
