/*
  Warnings:

  - Made the column `workspace_id` on table `budgets` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspace_id` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspace_id` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspace_id` on table `income` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "income" DROP CONSTRAINT "income_workspace_id_fkey";

-- AlterTable
ALTER TABLE "budgets" ALTER COLUMN "workspace_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "workspace_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "workspace_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "income" ALTER COLUMN "workspace_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
