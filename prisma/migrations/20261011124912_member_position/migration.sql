-- CreateEnum
CREATE TYPE "MemberPosition" AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'BOARD_MEMBER', 'LEGAL_ATTORNEY', 'LEGAL_SECRETARY', 'MEMBER');

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "position" "MemberPosition" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "member_position_idx" ON "member"("position");
