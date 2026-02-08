import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CAMPUS_DATA = [
  {
    name: 'Andrews',
    departments: [
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
      'College of Agriculture',
      'College of Hospitality Management',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
    ],
  },
  {
    name: 'Lasam',
    departments: [
      'College of Industrial Technology',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
    ],
  },
  {
    name: 'Piat',
    departments: [
      'College of Agriculture',
      'College of Criminal Justice Education',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
    ],
  },
  {
    name: 'Sanchez Mira', 
    departments: [
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
      'College of Agriculture',
      'College of Criminal Justice Education',
      'College of Information and Computing Sciences',
      'College of Teacher Education',
    ],
  },
  {
    name: 'University Administration',
    departments: [], // No default departments as per new instruction
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

  // Seed Organization: CSU
  let organization = await prisma.organization.findFirst({
    where: { name: 'Cagayan State University' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Cagayan State University',
        acronym: 'CSU',
      },
    });
    console.log(`Created Organization: ${organization.name}`);
  } else {
    console.log(`Using existing Organization: ${organization.name}`);
  }

  // Seed Campuses and Departments
  for (const campusData of CAMPUS_DATA) {
    // Check if campus exists
    let campus = await prisma.campus.findFirst({
        where: {
            name: campusData.name,
            organizationId: organization.id
        }
    });

    if (!campus) {
        campus = await prisma.campus.create({
            data: {
                name: campusData.name,
                organizationId: organization.id
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
    }

    // Special Case: Admin Department for Andrews Campus (Retained for backward compat/completeness)
    if (campusData.name === 'Andrews') {
        const adminDeptName = 'Admin Department';
        let adminDept = await prisma.department.findFirst({
            where: {
                name: adminDeptName,
                campusId: campus.id
            }
        });

        if (!adminDept) {
            adminDept = await prisma.department.create({
                data: {
                    name: adminDeptName,
                    campusId: campus.id,
                    icon: 'admin-icon.png' 
                }
            });
            console.log(`  Created Special Admin Department: ${adminDept.name}`);
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
