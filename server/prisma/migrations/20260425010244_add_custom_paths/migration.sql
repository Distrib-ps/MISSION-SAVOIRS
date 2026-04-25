-- CreateTable
CREATE TABLE "custom_paths" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_path_quizzes" (
    "customPathId" INTEGER NOT NULL,
    "quizId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "custom_path_quizzes_pkey" PRIMARY KEY ("customPathId","quizId")
);

-- AddForeignKey
ALTER TABLE "custom_paths" ADD CONSTRAINT "custom_paths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_path_quizzes" ADD CONSTRAINT "custom_path_quizzes_customPathId_fkey" FOREIGN KEY ("customPathId") REFERENCES "custom_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_path_quizzes" ADD CONSTRAINT "custom_path_quizzes_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
