/*
  Warnings:

  - You are about to drop the `Subject` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subjects" TEXT[];

-- DropTable
DROP TABLE "Subject";
