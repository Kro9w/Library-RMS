-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "uploadedBy" TEXT NOT NULL DEFAULT 'legacy_upload',
ADD COLUMN     "userID" TEXT NOT NULL DEFAULT 'legacy_user';
