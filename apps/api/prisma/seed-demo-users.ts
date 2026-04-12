import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const filipinoFirstNames = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Luis', 'Teresa', 'Carlos', 'Carmen'];
const filipinoLastNames = ['Dela Cruz', 'Garcia', 'Reyes', 'Ramos', 'Mendoza', 'Santos', 'Flores', 'Gonzales', 'Bautista', 'Villanueva'];

function getRandomName() {
  const firstName = filipinoFirstNames[Math.floor(Math.random() * filipinoFirstNames.length)];
  const lastName = filipinoLastNames[Math.floor(Math.random() * filipinoLastNames.length)];
  return { firstName, lastName };
}

function sanitizeForEmail(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '')            // Remove spaces
    .replace(/[^\w]+/g, '');        // Remove non-word chars
}

async function main() {
  console.log('Starting demo user seeding with Supabase Auth integration...');

  // 1. Batch fetch Carig Campus and its departments
  const carigCampus = await prisma.campus.findFirst({
    where: { name: 'Carig' },
    include: {
      departments: true,
    },
  });

  if (!carigCampus || carigCampus.departments.length === 0) {
    console.error('Error: Campus "Carig" or its departments not found. Please ensure seed.ts has been run.');
    process.exit(1);
  }

  const departments = carigCampus.departments;
  const departmentIds = departments.map(d => d.id);

  // 2. Batch fetch Level 1 roles for these departments
  const level1Roles = await prisma.role.findMany({
    where: {
      departmentId: { in: departmentIds },
      level: 1,
    },
  });

  // Create O(1) lookup map for roles
  const roleMap = new Map<string, string>();
  for (const role of level1Roles) {
    if (!roleMap.has(role.departmentId)) {
      roleMap.set(role.departmentId, role.id);
    }
  }

  // 3. Prepare user data to seed
  const usersToSeed: { 
    email: string; 
    firstName: string; 
    lastName: string; 
    departmentId: string; 
    roleId: string;
    departmentName: string;
  }[] = [];

  const generatedEmailsForRun = new Set<string>();

  for (const dept of departments) {
    const roleId = roleMap.get(dept.id);
    if (!roleId) {
      console.warn(`Warning: No Level 1 role found for department ${dept.name}. Skipping.`);
      continue;
    }

    let firstName = '';
    let lastName = '';
    let email = '';
    let isUnique = false;
    let attempts = 0;

    // Keep generating until we get an email that hasn't been used in this script run
    while (!isUnique) {
      const name = getRandomName();
      firstName = name.firstName;
      lastName = name.lastName;
      
      const cleanLast = sanitizeForEmail(lastName);
      const cleanFirst = sanitizeForEmail(firstName).substring(0, 2);
      
      const suffix = attempts > 2 ? `${attempts}` : '';
      email = `${cleanLast}${cleanFirst}${suffix}@test.com`;

      if (!generatedEmailsForRun.has(email)) {
        isUnique = true;
        generatedEmailsForRun.add(email);
      }
      attempts++;
    }

    usersToSeed.push({ email, firstName, lastName, departmentId: dept.id, roleId, departmentName: dept.name });
  }

  // 4. Batch fetch existing Prisma users
  const emailsToSeed = usersToSeed.map(u => u.email);
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emailsToSeed } },
    select: { email: true, id: true },
  });
  const existingEmails = new Set(existingUsers.map(u => u.email));

  // 5. Create users in Supabase Auth and then in Prisma
  const newUsersData: any[] = [];
  console.log(`\nCreating missing accounts in Supabase Auth (Password: 'password')...`);

  for (const u of usersToSeed) {
    if (existingEmails.has(u.email)) continue; // Already exists in Prisma

    // Create in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'password',
      email_confirm: true,
    });

    if (authError) {
      // If it already exists in Auth but wasn't in Prisma, we still need its Auth ID.
      // We can fetch it via the admin API.
      if (authError.message.includes('already exists') || authError.status === 422) {
        console.warn(`Auth user ${u.email} already exists in Supabase, attempting to link...`);
        // We have to list users to find the ID by email since getAuthUserByEmail doesn't exist directly
        // However, for simplicity of seeding, we can skip and advise dropping the auth user.
        // Or we can query users. A simple approach:
        const { data: searchData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = (searchData.users as any[]).find(user => user.email === u.email);
        
        if (existingAuthUser) {
           newUsersData.push({
            id: existingAuthUser.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            campusId: carigCampus.id,
            departmentId: u.departmentId,
          });
        } else {
           console.error(`Failed to link existing Supabase auth user for ${u.email}.`);
        }
      } else {
        console.error(`Failed to create Supabase Auth user for ${u.email}:`, authError.message);
      }
      continue;
    }

    if (authData.user) {
      newUsersData.push({
        id: authData.user.id, // REAL Supabase UUID!
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        campusId: carigCampus.id,
        departmentId: u.departmentId,
      });
    }
  }

  // 6. Bulk insert new users into Prisma
  if (newUsersData.length > 0) {
    await prisma.user.createMany({ data: newUsersData });
    console.log(`Bulk created ${newUsersData.length} new users in Prisma.`);
  }

  // 7. Connect roles for all users (both new and existing)
  const allUsersToConnect = await prisma.user.findMany({
    where: { email: { in: emailsToSeed } },
    select: { email: true, id: true }
  });

  const emailToRoleMap = new Map(usersToSeed.map(u => [u.email, u.roleId]));
  
  const updatePromises = allUsersToConnect.map(user => {
    const roleIdToConnect = emailToRoleMap.get(user.email)!;
    return prisma.user.update({
      where: { id: user.id },
      data: {
        roles: {
          connect: { id: roleIdToConnect }
        }
      }
    });
  });

  if (updatePromises.length > 0) {
    await prisma.$transaction(async (tx) => {
      return Promise.all(updatePromises);
    }, { timeout: 30000 });
    console.log(`Connected Level 1 roles for ${updatePromises.length} users.`);
  }

  console.log(`\nSuccessfully seeded demo users for Carig campus.`);
  console.log(`\n--- GENERATED TEST CREDENTIALS ---`);
  console.log(`Password for all accounts: password\n`);
  for (const user of usersToSeed) {
    console.log(`Dept: ${user.departmentName}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`----------------------------------`);
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
