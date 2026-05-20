import prisma from '../utils/prisma';

async function main() {
  const docs = await prisma.handoverDocument.findMany({
    take: 5,
    include: { items: true }
  });
  console.log('Handovers count:', docs.length);
  console.dir(docs, { depth: null });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
