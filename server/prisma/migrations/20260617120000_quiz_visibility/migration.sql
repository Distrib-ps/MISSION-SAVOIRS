-- CreateEnum
CREATE TYPE "QuizVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "visibility" "QuizVisibility" NOT NULL DEFAULT 'PUBLIC';
