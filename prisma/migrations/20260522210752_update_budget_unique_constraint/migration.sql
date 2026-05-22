/*
  Warnings:

  - A unique constraint covering the columns `[workspace_id,category_id,period]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "budgets_user_id_category_id_period_key";

-- CreateIndex
CREATE UNIQUE INDEX "budgets_workspace_id_category_id_period_key" ON "budgets"("workspace_id", "category_id", "period");
