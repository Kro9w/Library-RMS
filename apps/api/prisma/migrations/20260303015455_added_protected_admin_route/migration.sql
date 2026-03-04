/*
  Warnings:

  - You are about to drop the column `campusId` on the `Role` table. All the data in the column will be lost.
  - Added the required column `departmentId` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Role" DROP CONSTRAINT "Role_campusId_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "campusId",
ADD COLUMN     "departmentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
