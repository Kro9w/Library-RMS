import { PrismaClient, PermissionLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting ACL backfill migration...');

  const documents = await prisma.document.findMany({
    select: {
      id: true,
      uploadedById: true,
      classification: true,
      institutionId: true,
      campusId: true,
      departmentId: true,
      documentAccesses: true,
    },
  });

  console.log(`Found ${documents.length} documents. Backfilling Access Control...`);

  let count = 0;

  for (const doc of documents) {
    // Check if accesses already exist to make this script idempotent
    if (doc.documentAccesses.length > 0) {
      continue;
    }

    const accessesToCreate: any[] = [];

    // 1. Always give the owner WRITE access
    if (doc.uploadedById) {
      accessesToCreate.push({
        documentId: doc.id,
        userId: doc.uploadedById,
        permission: PermissionLevel.WRITE,
      });
    }

    // 2. Map classification to broad access
    if (doc.classification === 'INSTITUTIONAL' && doc.institutionId) {
      accessesToCreate.push({
        documentId: doc.id,
        institutionId: doc.institutionId,
        permission: PermissionLevel.READ,
      });
    } else if (doc.classification === 'INTERNAL' as any && doc.campusId) {
      accessesToCreate.push({
        documentId: doc.id,
        campusId: doc.campusId,
        permission: PermissionLevel.READ,
      });
    } else if (doc.classification === 'DEPARTMENTAL' as any && doc.departmentId) {
      accessesToCreate.push({
        documentId: doc.id,
        departmentId: doc.departmentId,
        permission: PermissionLevel.READ,
      });
    } else if (doc.classification === 'CONFIDENTIAL') {
      // No broad access, only the owner has access (already added above)
    }

    if (accessesToCreate.length > 0) {
      await prisma.documentAccess.createMany({
        data: accessesToCreate,
      });
      count += accessesToCreate.length;
    }
  }

  console.log(`Successfully created ${count} DocumentAccess records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
