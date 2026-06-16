-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "question_attempts" ADD COLUMN     "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NONE';
