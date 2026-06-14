-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "customPathId" INTEGER;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_customPathId_fkey" FOREIGN KEY ("customPathId") REFERENCES "custom_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;
