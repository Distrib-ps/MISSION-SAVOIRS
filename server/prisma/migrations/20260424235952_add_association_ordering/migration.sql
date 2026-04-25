-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'ASSOCIATION';
ALTER TYPE "QuestionType" ADD VALUE 'ORDERING';

-- AlterTable
ALTER TABLE "answers" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
