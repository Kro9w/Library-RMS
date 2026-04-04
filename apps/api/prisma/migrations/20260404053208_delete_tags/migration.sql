/*
  Warnings:

  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DocumentToTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_DocumentToTag" DROP CONSTRAINT "_DocumentToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DocumentToTag" DROP CONSTRAINT "_DocumentToTag_B_fkey";

-- DropTable
DROP TABLE "public"."Tag";

-- DropTable
DROP TABLE "public"."_DocumentToTag";
