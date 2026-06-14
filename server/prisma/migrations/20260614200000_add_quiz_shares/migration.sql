-- CreateTable
CREATE TABLE "quiz_shares" (
    "quizId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,

    CONSTRAINT "quiz_shares_pkey" PRIMARY KEY ("quizId","teacherId")
);

-- AddForeignKey
ALTER TABLE "quiz_shares" ADD CONSTRAINT "quiz_shares_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_shares" ADD CONSTRAINT "quiz_shares_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
