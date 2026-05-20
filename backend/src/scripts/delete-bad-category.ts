import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteCategoryWithChildren(id: number) {
  // Find all children
  const children = await prisma.assetCategory.findMany({
    where: { parentId: id }
  });

  for (const child of children) {
    await deleteCategoryWithChildren(child.id);
  }

  // Delete category itself
  await prisma.assetCategory.delete({
    where: { id }
  });
}

async function main() {
  console.log('Searching for "Bất động sản" level 1 category...');
  const badCategory = await prisma.assetCategory.findFirst({
    where: {
      code: 'Bất động sản',
      level: 1
    }
  });

  if (badCategory) {
    console.log(`Found category ID ${badCategory.id} (${badCategory.code} - ${badCategory.name}). Deleting...`);
    await deleteCategoryWithChildren(badCategory.id);
    console.log('Category and all its children deleted successfully.');
  } else {
    console.log('Category not found.');
  }

  // Also clean up any other category that might contain container description if it was created
  const containerCategory = await prisma.assetCategory.findFirst({
    where: {
      name: { contains: 'Container văn phòng 40 feet' }
    }
  });

  if (containerCategory) {
    console.log(`Found container category ID ${containerCategory.id}. Deleting...`);
    await deleteCategoryWithChildren(containerCategory.id);
    console.log('Container category deleted.');
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
