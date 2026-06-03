-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "last_alert_at" TIMESTAMP(3),
ADD COLUMN     "last_alert_type" TEXT;
