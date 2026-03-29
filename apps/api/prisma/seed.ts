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
    ],
  },
  {
    name: 'Lasam',
    departments: [
      'Office of the Campus Executive Officer',
      'College of Industrial Technology',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
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

  // Seed Global Tags
  const globalTags = [
    { name: 'for review', isGlobal: true, isLocked: true },
    { name: 'communication', isGlobal: true, isLocked: false },
    { name: 'approved', isGlobal: true, isLocked: true },
    { name: 'returned', isGlobal: true, isLocked: true },
    { name: 'disapproved', isGlobal: true, isLocked: true },
  ];

  for (const tag of globalTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log('Seeded global tags.');

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

  // Seed Campuses and Departments
  for (const campusData of CAMPUS_DATA) {
    // Check if campus exists
    let campus = await prisma.campus.findFirst({
        where: {
            name: campusData.name,
            institutionId: institution.id
        }
    });

    if (!campus) {
        campus = await prisma.campus.create({
            data: {
                name: campusData.name,
                institutionId: institution.id
            }
        });
        console.log(`Created Campus: ${campus.name}`);
    } else {
        console.log(`Using existing Campus: ${campus.name}`);
    }

    // Seed Departments for this Campus
    for (const deptName of campusData.departments) {
        let dept = await prisma.department.findFirst({
            where: {
                name: deptName,
                campusId: campus.id
            }
        });

        if (!dept) {
            dept = await prisma.department.create({
                data: {
                    name: deptName,
                    campusId: campus.id
                }
            });
            console.log(`  Created Department: ${dept.name}`);
        }

        // Seed Roles for this Department
        const rolesToSeed: { name: string; level: number; canManageUsers: boolean; canManageRoles: boolean; canManageDocuments: boolean; canManageInstitution?: boolean; }[] = [];

        // Rules based on user requirements:
        if (deptName === 'Office of the University President') {
            rolesToSeed.push({ name: 'University President', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true, canManageInstitution: true });
        } else if (deptName === 'Office of the Vice President for Academic Affairs') {
            rolesToSeed.push({ name: 'VPAA', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
        } else if (deptName === 'Office of the Vice President for Research, Development, and Extension') {
            rolesToSeed.push({ name: 'VPRDE', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
        } else if (deptName === 'Office of the Vice President for Administration and Finance') {
            rolesToSeed.push({ name: 'VPAF', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
        } else if (deptName === 'Office of the Vice President for Internationalization, Partnership, and Resource Mobilization') {
            rolesToSeed.push({ name: 'VPIPRM', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
        } else if (deptName === 'Office of the Campus Executive Officer') {
            rolesToSeed.push({ name: 'CEO', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true });
        } else if (deptName.startsWith('College of') || deptName === 'Graduate School') {
            rolesToSeed.push(
                { name: 'Dean', level: 1, canManageUsers: true, canManageRoles: true, canManageDocuments: true },
                { name: 'Program Coordinator', level: 3, canManageUsers: false, canManageRoles: false, canManageDocuments: false },
                { name: 'College Secretary', level: 3, canManageUsers: false, canManageRoles: false, canManageDocuments: false },
                { name: 'Faculty', level: 4, canManageUsers: false, canManageRoles: false, canManageDocuments: false }
            );
        }

        for (const roleData of rolesToSeed) {
            let role = await prisma.role.findFirst({
                where: {
                    name: roleData.name,
                    departmentId: dept.id
                }
            });

            if (!role) {
                await prisma.role.create({
                    data: {
                        name: roleData.name,
                        level: roleData.level,
                        canManageUsers: roleData.canManageUsers,
                        canManageRoles: roleData.canManageRoles,
                        canManageDocuments: roleData.canManageDocuments,
                        canManageInstitution: roleData.canManageInstitution ?? false,
                        departmentId: dept.id
                    }
                });
                console.log(`    Created Role: ${roleData.name}`);
            }
        }
    }

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
