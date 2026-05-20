import prisma from '../utils/prisma';

async function main() {
  const userCount = await prisma.user.count();
  const assetCount = await prisma.asset.count();
  const categoryCount = await prisma.assetCategory.count();
  const deptCount = await prisma.department.count();
  const companyCount = await prisma.company.count();
  
  console.log('Database Counts:');
  console.log('- Users:', userCount);
  console.log('- Assets:', assetCount);
  console.log('- Categories:', categoryCount);
  console.log('- Departments:', deptCount);
  console.log('- Companies:', companyCount);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
