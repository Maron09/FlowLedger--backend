import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@flowledger.app' },
    update: {},
    create: {
      email: 'admin@flowledger.app',
      passwordHash,
      firstName: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log('Admin created:', admin.email);
  console.log('Password: Admin1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());