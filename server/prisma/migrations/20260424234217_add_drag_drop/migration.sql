-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'DRAG_DROP';

-- AlterTable
ALTER TABLE "answers" ADD COLUMN     "zone" TEXT;
