-- AlterTable
ALTER TABLE "member" ADD COLUMN     "cardToken" TEXT,
ADD COLUMN     "cardTokenAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "member_cardToken_key" ON "member"("cardToken");
