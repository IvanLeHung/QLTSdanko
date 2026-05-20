import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeCode(code: string): string {
  const num = parseInt(code, 10);
  if (!isNaN(num) && num >= 1 && num <= 99) {
    return String(num).padStart(2, '0');
  }
  return code.trim();
}

async function redirectUserDataScope(fromId: number, toId: number) {
  const scopes = await prisma.userDataScope.findMany();
  for (const scope of scopes) {
    if (scope.categoryIdsJson) {
      try {
        const ids: any[] = JSON.parse(scope.categoryIdsJson);
        let scopeUpdated = false;
        const newIds = ids.map((id) => {
          if (id === fromId || String(id) === String(fromId)) {
            scopeUpdated = true;
            return toId;
          }
          return id;
        });
        if (scopeUpdated) {
          await prisma.userDataScope.update({
            where: { id: scope.id },
            data: { categoryIdsJson: JSON.stringify(newIds) },
          });
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

async function mergeCategories(fromId: number, toId: number) {
  const fromChildren = await prisma.assetCategory.findMany({
    where: { parentId: fromId }
  });

  for (const child of fromChildren) {
    const normCode = normalizeCode(child.code);
    const existingChild = await prisma.assetCategory.findFirst({
      where: {
        parentId: toId,
        level: child.level,
        code: { in: [child.code, normCode] }
      }
    });

    if (existingChild) {
      // Recursively merge
      await mergeCategories(child.id, existingChild.id);
      
      // Update UserDataScope
      await redirectUserDataScope(child.id, existingChild.id);

      // Delete the child after merge
      await prisma.assetCategory.delete({
        where: { id: child.id }
      });
    } else {
      // Move child and normalize its code
      await prisma.assetCategory.update({
        where: { id: child.id },
        data: {
          parentId: toId,
          code: normCode
        }
      });
    }
  }
}

async function main() {
  console.log('Starting asset category cleanup and normalization...');

  // 1. Normalize all Assets
  console.log('Normalizing Asset classification codes...');
  const assets = await prisma.asset.findMany();
  let updatedAssets = 0;
  for (const asset of assets) {
    const newL1 = normalizeCode(asset.level1Code);
    const newL2 = normalizeCode(asset.level2Code);
    const newL3 = normalizeCode(asset.level3Code);
    const newL4 = normalizeCode(asset.level4Code);

    if (
      newL1 !== asset.level1Code ||
      newL2 !== asset.level2Code ||
      newL3 !== asset.level3Code ||
      newL4 !== asset.level4Code
    ) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          level1Code: newL1,
          level2Code: newL2,
          level3Code: newL3,
          level4Code: newL4,
        },
      });
      updatedAssets++;
    }
  }
  console.log(`Normalized codes for ${updatedAssets} assets.`);

  // 2. Normalize and merge AssetCodeCounters
  console.log('Normalizing AssetCodeCounters...');
  const counters = await prisma.assetCodeCounter.findMany();
  let updatedCounters = 0;
  let mergedCounters = 0;
  for (const counter of counters) {
    const newL1 = normalizeCode(counter.level1Code);
    const newL2 = normalizeCode(counter.level2Code);
    const newL3 = normalizeCode(counter.level3Code);
    const newL4 = normalizeCode(counter.level4Code);

    if (
      newL1 !== counter.level1Code ||
      newL2 !== counter.level2Code ||
      newL3 !== counter.level3Code ||
      newL4 !== counter.level4Code
    ) {
      const existingCounter = await prisma.assetCodeCounter.findFirst({
        where: {
          companyCode: counter.companyCode,
          level1Code: newL1,
          level2Code: newL2,
          level3Code: newL3,
          level4Code: newL4,
        },
      });

      if (existingCounter && existingCounter.id !== counter.id) {
        const maxNum = Math.max(existingCounter.lastNumber, counter.lastNumber);
        await prisma.assetCodeCounter.update({
          where: { id: existingCounter.id },
          data: { lastNumber: maxNum },
        });
        await prisma.assetCodeCounter.delete({
          where: { id: counter.id },
        });
        mergedCounters++;
      } else {
        await prisma.assetCodeCounter.update({
          where: { id: counter.id },
          data: {
            level1Code: newL1,
            level2Code: newL2,
            level3Code: newL3,
            level4Code: newL4,
          },
        });
        updatedCounters++;
      }
    }
  }
  console.log(`Updated ${updatedCounters} counters, merged ${mergedCounters} counters.`);

  // 3. Find and merge duplicates in AssetCategory level-by-level
  console.log('Finding and merging duplicate AssetCategories level-by-level...');
  let totalMerged = 0;
  let totalNormalized = 0;

  for (let level = 1; level <= 4; level++) {
    console.log(`Processing Level ${level}...`);
    const categories = await prisma.assetCategory.findMany({
      where: { level }
    });

    for (const cat of categories) {
      const freshCat = await prisma.assetCategory.findUnique({ where: { id: cat.id } });
      if (!freshCat) continue;

      const norm = normalizeCode(freshCat.code);
      if (freshCat.code !== norm) {
        const existing = await prisma.assetCategory.findFirst({
          where: {
            parentId: freshCat.parentId,
            level: freshCat.level,
            code: norm
          }
        });

        if (existing) {
          console.log(`Merging duplicate category ID ${freshCat.id} (${freshCat.code} - ${freshCat.name}) into ID ${existing.id} (${existing.code})`);
          
          // Merge children recursively
          await mergeCategories(freshCat.id, existing.id);

          // Update UserDataScope
          await redirectUserDataScope(freshCat.id, existing.id);

          // Delete duplicate
          await prisma.assetCategory.delete({
            where: { id: freshCat.id }
          });
          totalMerged++;
        } else {
          // No standard category exists, safe to rename code to normalized format
          await prisma.assetCategory.update({
            where: { id: freshCat.id },
            data: { code: norm }
          });
          totalNormalized++;
        }
      }
    }
  }

  console.log(`Merged and deleted ${totalMerged} duplicate categories.`);
  console.log(`Normalized ${totalNormalized} category codes.`);
  console.log('Asset category cleanup completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
