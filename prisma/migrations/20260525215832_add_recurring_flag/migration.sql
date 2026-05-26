-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false;
