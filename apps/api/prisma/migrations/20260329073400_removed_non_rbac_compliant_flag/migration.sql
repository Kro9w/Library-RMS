/*
  Warnings:

  - You are about to drop the column `isSuperAdmin` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "canManageInstitution" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isSuperAdmin";
