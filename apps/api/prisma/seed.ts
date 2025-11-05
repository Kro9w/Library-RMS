import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
