import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, isActive: true },
    create: { username: 'admin', passwordHash, fullName: 'Administrator', role: 'ADMIN', isActive: true },
  });
  console.log('Admin password reset to: admin123');
  await prisma.$disconnect();
}

reset();
