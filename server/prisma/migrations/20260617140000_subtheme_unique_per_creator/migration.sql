-- DropIndex
DROP INDEX "sub_themes_themeId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "sub_themes_themeId_name_createdById_key" ON "sub_themes"("themeId", "name", "createdById");

