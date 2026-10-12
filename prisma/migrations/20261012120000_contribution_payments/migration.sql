-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'GCASH', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('QR', 'MANUAL', 'IMPORT');

-- CreateTable
CREATE TABLE "contribution_payment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidOn" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "source" "PaymentSource" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "contribution_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contribution_payment_memberId_paidOn_idx" ON "contribution_payment"("memberId", "paidOn");

-- CreateIndex
CREATE INDEX "contribution_payment_paidOn_idx" ON "contribution_payment"("paidOn");

-- CreateIndex
CREATE INDEX "contribution_payment_createdAt_idx" ON "contribution_payment"("createdAt");

-- AddForeignKey
ALTER TABLE "contribution_payment" ADD CONSTRAINT "contribution_payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_payment" ADD CONSTRAINT "contribution_payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_payment" ADD CONSTRAINT "contribution_payment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

