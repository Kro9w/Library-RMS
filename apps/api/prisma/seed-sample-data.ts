import {
  PrismaClient,
  DispositionAction,
  Category,
  PermissionLevel,
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.',
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

const bucketName = process.env.VITE_SUPABASE_BUCKET_NAME || 'FolioDocs';

function getInitials(departmentName: string) {
  const ignoreWords = ['of', 'the', 'and', 'for'];
  return departmentName
    .split(' ')
    .filter(
      (word) => word.length > 0 && !ignoreWords.includes(word.toLowerCase()),
    )
    .map((word) => word[0].toUpperCase())
    .join('');
}

function generateControlNumber(
  officeInitials: string,
  documentTypeInitials: string,
  randomDate: string,
) {
  // 2 random digits
  const randomDigits = Math.floor(10 + Math.random() * 90);

  // CSU-CA-{Initials of Office Unit}-{Initials of the Document type}-{2 random digits}-{random date}-FL
  return `CSU-CA-${officeInitials}-${documentTypeInitials}-${randomDigits}-${randomDate}-FL`;
}

// Minimal Blank PDF Base64
const blankPdfBase64 = `JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgkJPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9GCg==`;

async function main() {
  console.log('Seeding demo sample data...');

  // 1. Get ALL existing users from Carig campus to own the documents uniformly
  const users = await prisma.user.findMany({
    where: {
      campus: {
        name: 'Carig',
      },
    },
    include: {
      campus: true,
      department: true,
    },
  });

  const validUsers = users.filter((u) => u.department);

  if (validUsers.length === 0) {
    console.error(
      'No valid users found for Carig campus with a department. Please run seed:demo first.',
    );
    process.exit(1);
  }

  // Precompute initials O(1) loop up
  const userInitialsMap = new Map();
  for (const user of validUsers) {
    if (user.department) {
      userInitialsMap.set(user.id, getInitials(user.department.name));
    }
  }

  // Define realistic Records Series for a university with retention
  const seriesData = [
    {
      name: 'Administrative Records',
      types: [
        { name: 'Memos', color: '#ff5733', active: 0, inactive: 2 }, // Explicitly inactive (0 active)
        {
          name: 'Meeting Minutes',
          color: '#33ff57',
          active: null,
          inactive: null,
        },
        { name: 'Policies', color: '#3357ff', active: null, inactive: null },
      ],
    },
    {
      name: 'Academic Records',
      types: [
        { name: 'Syllabi', color: '#ff33a8', active: 0, inactive: 3 }, // Explicitly inactive (0 active)
        {
          name: 'Curriculum Approvals',
          color: '#a833ff',
          active: null,
          inactive: null,
        },
        {
          name: 'Accreditation Reports',
          color: '#33fff5',
          active: null,
          inactive: null,
        },
      ],
    },
    {
      name: 'Financial Records',
      types: [
        { name: 'Invoices', color: '#ffc300', active: null, inactive: null },
        {
          name: 'Purchase Orders',
          color: '#da70d6',
          active: null,
          inactive: null,
        },
        { name: 'Budgets', color: '#00ced1', active: null, inactive: null },
      ],
    },
    {
      name: 'Personnel Records',
      types: [
        { name: 'Timesheets', color: '#8b4513', active: 0, inactive: 1 }, // Explicitly inactive (0 active)
        {
          name: 'Performance Reviews',
          color: '#2e8b57',
          active: null,
          inactive: null,
        },
        {
          name: 'Leave Requests',
          color: '#4682b4',
          active: null,
          inactive: null,
        },
      ],
    },
  ];

  const documentTypeMap: any[] = [];

  for (const sData of seriesData) {
    const series = await prisma.recordsSeries.upsert({
      where: { name: sData.name },
      update: {},
      create: {
        name: sData.name,
        activeRetentionDuration: 5, // Default for the series
        inactiveRetentionDuration: 2,
        dispositionAction: DispositionAction.ARCHIVE,
      },
    });

    for (const tData of sData.types) {
      const docType = await prisma.documentType.upsert({
        where: { name: tData.name },
        update: {
          color: tData.color,
          recordsSeriesId: series.id,
          activeRetentionDuration: tData.active,
          inactiveRetentionDuration: tData.inactive,
        },
        create: {
          name: tData.name,
          color: tData.color,
          recordsSeriesId: series.id,
          activeRetentionDuration: tData.active,
          inactiveRetentionDuration: tData.inactive,
        },
      });
      documentTypeMap.push({
        ...docType,
        seriesActive: series.activeRetentionDuration,
        seriesInactive: series.inactiveRetentionDuration,
        seriesAction: series.dispositionAction,
      });
    }
  }

  console.log('Seeded records series and document types with retention.');

  const numDocuments = 500;
  let count = 0;

  const pdfBuffer = Buffer.from(blankPdfBase64, 'base64');

  for (let i = 0; i < numDocuments; i++) {
    const user = validUsers[Math.floor(Math.random() * validUsers.length)];
    const officeInitials = userInitialsMap.get(user.id);

    const randomType =
      documentTypeMap[Math.floor(Math.random() * documentTypeMap.length)];

    // Generate date logic
    const today = new Date();
    // Random date from 0 to 6 years ago
    const pastDate = new Date(
      today.getTime() - Math.random() * (6 * 365 * 24 * 60 * 60 * 1000),
    );

    const mm = String(pastDate.getMonth() + 1).padStart(2, '0');
    const dd = String(pastDate.getDate()).padStart(2, '0');
    const yy = String(pastDate.getFullYear()).slice(-2);
    const randomDateStr = `${mm}${dd}${yy}`;

    const docTypeInitials = getInitials(randomType.name);
    const controlNumber = generateControlNumber(
      officeInitials,
      docTypeInitials,
      randomDateStr,
    );
    const fileName = `Sample_${randomType.name.replace(/\s+/g, '_')}_${i + 1}.pdf`;

    // Generate unique storage key
    const s3Key = `documents/${user.id}/${Date.now()}_${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(s3Key, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload blank PDF to Supabase:', uploadError);
      continue;
    }

    // Calculate Maturity Date
    const finalActiveDuration =
      randomType.activeRetentionDuration !== null
        ? randomType.activeRetentionDuration
        : randomType.seriesActive;
    const finalInactiveDuration =
      randomType.inactiveRetentionDuration !== null
        ? randomType.inactiveRetentionDuration
        : randomType.seriesInactive;
    const action = randomType.dispositionAction || randomType.seriesAction;

    let maturityDate = new Date(pastDate);
    if (finalActiveDuration) {
      maturityDate.setFullYear(
        maturityDate.getFullYear() + finalActiveDuration,
      );
    }
    if (finalInactiveDuration) {
      maturityDate.setFullYear(
        maturityDate.getFullYear() + finalInactiveDuration,
      );
    }

    // Insert document into db
    await prisma.document.create({
      data: {
        title: `Sample ${randomType.name} - ${i + 1}`,
        fileName: fileName,
        content: '', // Blank content
        controlNumber: controlNumber,
        category: Category.INTERNAL,
        createdAt: pastDate,
        uploadedById: user.id,
        originalSenderId: user.id,
        documentTypeId: randomType.id,
        campusId: user.campusId,
        departmentId: user.departmentId,
        documentAccesses: {
          create: [
            {
              userId: user.id,
              permission: PermissionLevel.WRITE,
            },
          ],
        },
        versions: {
          create: [
            {
              versionNumber: 1,
              s3Key: s3Key,
              s3Bucket: bucketName,
              fileType: 'application/pdf',
              fileSize: pdfBuffer.length,
              uploadedById: user.id,
            },
          ],
        },
        workflow: {
          create: {
            recordStatus: 'FINAL',
          },
        },
        lifecycle: {
          create: {
            activeRetentionSnapshot: finalActiveDuration,
            inactiveRetentionSnapshot: finalInactiveDuration,
            dispositionActionSnapshot: action,
            dispositionMaturityDate: maturityDate,
          },
        },
      },
    });
    count++;
  }

  console.log(
    `Successfully seeded ${count} sample documents for Carig campus (spread across departments).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
