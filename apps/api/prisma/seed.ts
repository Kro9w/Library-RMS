import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CAMPUS_DATA = [
  {
    name: 'Andrews',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Allied Health Sciences',
      'College of Business Entrepreneurship and Accountancy',
      'College of Hospitality Management',
      'College of Teacher Education',
      'Graduate School',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Aparri',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Business Entrepreneurship and Accountancy',
      'College of Criminal Justice Education',
      'College of Fisheries and Aquatic Sciences',
      'College of Hospitality Management',
      'College of Industrial Technology',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Graduate School',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Carig',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Information and Computing Sciences',
      'College of Engineering and Architecture',
      'College of Human Kinetics',
      'College of Industrial Technology',
      'College of Medicine',
      'College of Public Administration',
      'College of Veterinary Medicine',
      'College of Humanities and Social Sciences',
      'College of Natural Science and Mathematics',
      'College of Nursing',
      'Graduate School',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Gonzaga',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Agriculture',
      'College of Business Entrepreneurship and Accountancy',
      'College of Criminal Justice Education',
      'College of Hospitality Management',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Lal-lo',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Agriculture',
      'College of Hospitality Management',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Lasam',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Industrial Technology',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Piat',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Agriculture',
      'College of Criminal Justice Education',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Sanchez Mira', 
    departments: [
      'Office of the Campus Executive Officer',
      'College of Agriculture',
      'College of Business Entrepreneurship and Accountancy',
      'College of Criminal Justice Education',
      'College of Engineering',
      'College of Hospitality Management',
      'College of Industrial Technology',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Graduate School',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'Solana-Lara',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Agriculture',
      'College of Criminal Justice Education',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
      'Office of the Campus Director for Academic Affairs',
      'Office of Student Development and Welfare',
      'Office of the Campus Director for Administration and Finance',
    ],
  },
  {
    name: 'University Administration',
    departments: [
      'Office of the University President',
      'Office of the Vice President for Academic Affairs',
      'Office of the Vice President for Research, Development, and Extension',
      'Office of the Vice President for Administration and Finance',
      'Office of the Vice President for Internationalization, Partnership, and Resource Mobilization',
    ],
  }
];

async function main() {
  console.log('Start seeding ...');

  // Seed Institution: CSU
  let institution = await prisma.institution.findFirst({
    where: { name: 'Cagayan State University' },
  });

  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: 'Cagayan State University',
        acronym: 'CSU',
      },
    });
    console.log(`Created Institution: ${institution.name}`);
  } else {
    console.log(`Using existing Institution: ${institution.name}`);
  }

  // 1. Batch Seed Campuses
  const existingCampuses = await prisma.campus.findMany({
    where: { institutionId: institution.id }
  });
  
  const existingCampusNames = new Set(existingCampuses.map(c => c.name));
  const campusesToCreate = CAMPUS_DATA
    .filter(c => !existingCampusNames.has(c.name))
    .map(c => ({
      name: c.name,
      institutionId: institution.id,
    }));

  if (campusesToCreate.length > 0) {
    await prisma.campus.createMany({ data: campusesToCreate });
    console.log(`Created ${campusesToCreate.length} new campuses.`);
  }

  // Refetch all campuses to get their generated IDs
  const allCampuses = await prisma.campus.findMany({
    where: { institutionId: institution.id }
  });
  const campusMap = new Map(allCampuses.map(c => [c.name, c.id]));

  // 2. Batch Seed Departments
  const departmentsData: { name: string; campusId: string }[] = [];
  for (const campusData of CAMPUS_DATA) {
    const campusId = campusMap.get(campusData.name);
    if (!campusId) continue; // Should not happen, just for safety
    for (const deptName of campusData.departments) {
      departmentsData.push({ name: deptName, campusId });
    }
  }

  const existingDepartments = await prisma.department.findMany({
    where: { campusId: { in: Array.from(campusMap.values()) } }
  });
  const existingDeptKeys = new Set(existingDepartments.map(d => `${d.campusId}-${d.name}`));

  const departmentsToCreate = departmentsData.filter(d => !existingDeptKeys.has(`${d.campusId}-${d.name}`));

  if (departmentsToCreate.length > 0) {
    await prisma.department.createMany({ data: departmentsToCreate });
    console.log(`Created ${departmentsToCreate.length} new departments.`);
  }

  // Refetch departments to get their generated IDs for Roles
  const allDepartments = await prisma.department.findMany({
    where: { campusId: { in: Array.from(campusMap.values()) } }
  });
  const deptMap = new Map(allDepartments.map(d => [`${d.campusId}-${d.name}`, d.id]));

  // 3. Batch Seed Roles
  const rolesData: { name: string; level: number; canManageUsers: boolean; canManageRoles: boolean; canManageDocuments: boolean; canManageInstitution: boolean; departmentId: string; }[] = [];

  for (const campusData of CAMPUS_DATA) {
    const campusId = campusMap.get(campusData.name);
    if (!campusId) continue;

    for (const deptName of campusData.departments) {
      const deptId = deptMap.get(`${campusId}-${deptName}`);
      if (!deptId) continue;

      const rolesToSeed: { name: string; level: number; canManageUsers: boolean; canManageRoles: boolean; canManageDocuments: boolean; canManageInstitution?: boolean; }[] = [];

      // Rules based on user requirements:
      if (deptName === 'Office of the University President') {
          rolesToSeed.push({ name: 'University President', level: 0, canManageUsers: true, canManageRoles: true, canManageDocuments: true, canManageInstitution: true });
      } else if (deptName === 'Office of the Vice President for Academic Affairs') {
          rolesToSeed.push({ name: 'VPAA', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of the Vice President for Research, Development, and Extension') {
          rolesToSeed.push({ name: 'VPRDE', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of the Vice President for Administration and Finance') {
          rolesToSeed.push({ name: 'VPAF', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of the Vice President for Internationalization, Partnership, and Resource Mobilization') {
          rolesToSeed.push({ name: 'VPIPRM', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of the Campus Executive Officer') {
          rolesToSeed.push({ name: 'CEO', level: 0, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of the Campus Director for Academic Affairs') {
          rolesToSeed.push({ name: 'CDAA', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of Student Development and Welfare') {
          rolesToSeed.push({ name: 'OSDW Coordinator', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName === 'Office of the Campus Director for Administration and Finance') {
          rolesToSeed.push({ name: 'CDAF', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
      } else if (deptName.startsWith('College of') || deptName === 'Graduate School') {
          rolesToSeed.push(
              { name: 'Dean', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true },
              { name: 'Program Coordinator', level: 2, canManageUsers: false, canManageRoles: false, canManageDocuments: true },
              { name: 'College Secretary', level: 3, canManageUsers: false, canManageRoles: false, canManageDocuments: true },
              { name: 'Faculty', level: 4, canManageUsers: false, canManageRoles: false, canManageDocuments: false }
          );
      }

      for (const role of rolesToSeed) {
        rolesData.push({
          ...role,
          canManageInstitution: role.canManageInstitution ?? false,
          departmentId: deptId
        });
      }
    }
  }

  const existingRoles = await prisma.role.findMany({
    where: { departmentId: { in: Array.from(deptMap.values()) } }
  });
  const existingRoleKeys = new Set(existingRoles.map(r => `${r.departmentId}-${r.name}`));

  const rolesToCreate = rolesData.filter(r => !existingRoleKeys.has(`${r.departmentId}-${r.name}`));

  if (rolesToCreate.length > 0) {
    await prisma.role.createMany({ data: rolesToCreate });
    console.log(`Created ${rolesToCreate.length} new roles.`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
