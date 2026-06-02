-- AlterTable
ALTER TABLE "tax_profiles" ADD COLUMN     "business_sector" TEXT,
ADD COLUMN     "business_size" TEXT,
ADD COLUMN     "deductible_categories" TEXT[],
ADD COLUMN     "handles_paye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vat_registered" BOOLEAN NOT NULL DEFAULT false;
