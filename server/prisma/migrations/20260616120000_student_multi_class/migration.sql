-- CreateTable (jonction many-to-many élève ↔ classe)
CREATE TABLE "_StudentClasses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StudentClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StudentClasses_B_index" ON "_StudentClasses"("B");

-- AddForeignKey
ALTER TABLE "_StudentClasses" ADD CONSTRAINT "_StudentClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentClasses" ADD CONSTRAINT "_StudentClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration des données : conserver les appartenances existantes (A = classe, B = élève)
INSERT INTO "_StudentClasses" ("A","B")
SELECT "classId","id" FROM "users" WHERE "classId" IS NOT NULL;

-- DropForeignKey + colonne classId (remplacée par la jonction)
ALTER TABLE "users" DROP CONSTRAINT "users_classId_fkey";
ALTER TABLE "users" DROP COLUMN "classId";
