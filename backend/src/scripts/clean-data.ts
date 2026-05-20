import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTableSafe(tableName: string, deleteFn: () => Promise<{ count: number }>) {
  console.log(`- Đang xóa dữ liệu bảng ${tableName}...`);
  try {
    const result = await deleteFn();
    console.log(`  -> Thành công: Đã xóa ${result.count} bản ghi.`);
  } catch (error: any) {
    if (error.code === 'P2021') {
      console.warn(`  -> Bỏ qua: Bảng ${tableName} không tồn tại trong database hiện tại.`);
    } else {
      console.error(`  -> Lỗi khi xóa bảng ${tableName}:`, error.message);
    }
  }
}

async function main() {
  console.log('=== BẮT ĐẦU DỌN DẸP DỮ LIỆU TÀI SẢN VÀ BIÊN BẢN (PHƯƠNG ÁN 2) ===');

  try {
    // 1. Xóa các bảng lịch sử / nhật ký / quan hệ trực tiếp của Asset (Con)
    await deleteTableSafe('AssetHistory', () => prisma.assetHistory.deleteMany());
    await deleteTableSafe('AssetAssignment', () => prisma.assetAssignment.deleteMany());
    await deleteTableSafe('AssetEvent', () => prisma.assetEvent.deleteMany());
    await deleteTableSafe('AssetEditLog', () => prisma.assetEditLog.deleteMany());
    await deleteTableSafe('AssetRepairLog', () => prisma.assetRepairLog.deleteMany());
    await deleteTableSafe('AssetRepairTicket', () => prisma.assetRepairTicket.deleteMany());
    await deleteTableSafe('DamageReportItem', () => prisma.damageReportItem.deleteMany());
    await deleteTableSafe('DamageReport', () => prisma.damageReport.deleteMany());
    await deleteTableSafe('LostReportLog', () => prisma.lostReportLog.deleteMany());
    await deleteTableSafe('LostReport', () => prisma.lostReport.deleteMany());
    await deleteTableSafe('LiquidationItem', () => prisma.liquidationItem.deleteMany());
    await deleteTableSafe('LiquidationRecord', () => prisma.liquidationRecord.deleteMany());
    await deleteTableSafe('InventoryItem', () => prisma.inventoryItem.deleteMany());
    await deleteTableSafe('InventoryCheck', () => prisma.inventoryCheck.deleteMany());
    await deleteTableSafe('HandoverItem', () => prisma.handoverItem.deleteMany());
    await deleteTableSafe('HandoverDocument', () => prisma.handoverDocument.deleteMany());

    // 2. Xóa lỗi import và lô import
    await deleteTableSafe('ImportError', () => prisma.importError.deleteMany());
    await deleteTableSafe('ImportBatch', () => prisma.importBatch.deleteMany());

    // 3. Xóa Asset và các liên kết hóa đơn
    await deleteTableSafe('Asset', () => prisma.asset.deleteMany());
    await deleteTableSafe('CreationBatch', () => prisma.creationBatch.deleteMany());
    await deleteTableSafe('AssetInvoiceLine', () => prisma.assetInvoiceLine.deleteMany());
    await deleteTableSafe('AssetInvoiceBatch', () => prisma.assetInvoiceBatch.deleteMany());

    // 4. Xóa tài liệu tự sinh và log template
    await deleteTableSafe('GeneratedDocument', () => prisma.generatedDocument.deleteMany());
    await deleteTableSafe('TemplateUsageLog', () => prisma.templateUsageLog.deleteMany());

    // 5. Xóa nhật ký hệ thống (AuditLog)
    await deleteTableSafe('AuditLog', () => prisma.auditLog.deleteMany());

    // 6. Reset bộ đếm mã tài sản và bộ đếm biên bản (Counters)
    await deleteTableSafe('AssetCodeCounter', () => prisma.assetCodeCounter.deleteMany());
    await deleteTableSafe('DocumentCounter', () => prisma.documentCounter.deleteMany());

    console.log('=== DỌN DẸP DỮ LIỆU HOÀN TẤT THÀNH CÔNG ===');
  } catch (error) {
    console.error('Lỗi nghiêm trọng trong quá trình dọn dẹp:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
