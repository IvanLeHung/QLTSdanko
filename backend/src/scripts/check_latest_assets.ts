import prisma from '../utils/prisma';

async function main() {
  const latest = await prisma.asset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.dir(latest, { depth: null });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
