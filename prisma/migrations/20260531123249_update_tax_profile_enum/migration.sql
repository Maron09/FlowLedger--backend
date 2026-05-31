/*
  Warnings:

  - The `employment_type` column on the `tax_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('SALARIED', 'SELF_EMPLOYED', 'MIXED');

-- AlterTable
ALTER TABLE "tax_profiles" DROP COLUMN "employment_type",
ADD COLUMN     "employment_type" "EmploymentType" NOT NULL DEFAULT 'SELF_EMPLOYED';
