/*
  Warnings:

  - You are about to drop the column `isApproved` on the `Teacher` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'CONFIRMED', 'APPROVED', 'REJECTED', 'SUSBENDED');

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "isApproved";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'CONFIRMED';
