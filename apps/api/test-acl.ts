import { PermissionLevel, PrismaClient } from '@prisma/client';
import { AccessControlService } from './src/documents/access-control.service';

const prisma = new PrismaClient();
const accessControlService = new AccessControlService();

async function run() {
  console.log('Testing ACL Logic');

  // We don't have a DB connected in this sandbox likely, but we can verify the WHERE clause generation.
  
  const userFromCampusA = {
    id: 'user-a',
    institutionId: 'inst-1',
    campusId: 'campus-a',
    departmentId: 'dept-a',
    roles: []
  };

  const aclWhereUserA: any = accessControlService.generateAclWhereClause(userFromCampusA);
  console.log('ACL Where Clause for User A (Campus A):', JSON.stringify(aclWhereUserA, null, 2));

  // Simulating the Prisma logic
  // A confidential document for Campus B would only have a DocumentAccess record for user-b
  // Let's ensure the WHERE clause strictly checks the documentAccesses array.

  const hasAccessArray = aclWhereUserA?.documentAccesses?.some?.OR;
  const checksCampus = hasAccessArray?.find((cond: any) => cond.campusId === 'campus-a');
  
  if (checksCampus) {
    console.log('SUCCESS: The generated where clause explicitly checks for Campus A access records.');
  } else {
    console.log('FAIL: Campus check missing.');
  }

  // A document from Campus B will NOT have a DocumentAccess record with campusId='campus-a'.
  // It will have campusId='campus-b' or userId='user-b'. 
  // Thus, Prisma will filter it out securely.
}

run().catch(console.error);
