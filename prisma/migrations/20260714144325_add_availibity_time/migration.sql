/*
  Warnings:

  - The values [TEACHE] on the enum `LanguageType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `Availability` table. All the data in the column will be lost.
  - Added the required column `fromTime` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toTime` to the `Availability` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LanguageType_new" AS ENUM ('SPEAK', 'TEACH', 'LEARN');
ALTER TABLE "Language" ALTER COLUMN "languageType" TYPE "LanguageType_new" USING ("languageType"::text::"LanguageType_new");
ALTER TYPE "LanguageType" RENAME TO "LanguageType_old";
ALTER TYPE "LanguageType_new" RENAME TO "LanguageType";
DROP TYPE "public"."LanguageType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "userId",
ADD COLUMN     "fromTime" TIME(0) NOT NULL,
ADD COLUMN     "toTime" TIME(0) NOT NULL;
