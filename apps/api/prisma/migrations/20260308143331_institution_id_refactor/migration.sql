/*
  Warnings:

  - You are about to drop the `DocumentAccess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DocumentAccess" DROP CONSTRAINT "DocumentAccess_campusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentAccess" DROP CONSTRAINT "DocumentAccess_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentAccess" DROP CONSTRAINT "DocumentAccess_documentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentAccess" DROP CONSTRAINT "DocumentAccess_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentAccess" DROP CONSTRAINT "DocumentAccess_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentAccess" DROP CONSTRAINT "DocumentAccess_userId_fkey";

-- DropTable
DROP TABLE "public"."DocumentAccess";

-- DropEnum
DROP TYPE "public"."PermissionLevel";
