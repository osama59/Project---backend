/*
  Warnings:

  - You are about to drop the `StudentRateTeacher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StudentRateTeacher" DROP CONSTRAINT "StudentRateTeacher_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentRateTeacher" DROP CONSTRAINT "StudentRateTeacher_teacherId_fkey";

-- DropTable
DROP TABLE "StudentRateTeacher";
