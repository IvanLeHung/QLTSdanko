const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const templates = [
  { templateCode: 'BM01', templateName: 'Biên bản bàn giao tài sản mới', businessModule: 'CREATION', description: 'Dùng khi nhập tài sản mới từ mua sắm/kho' },
  { templateCode: 'BM02', templateName: 'Biên bản bàn giao tài sản', businessModule: 'HANDOVER', description: 'Dùng cho bàn giao hoặc thu hồi tài sản' },
  { templateCode: 'BM03', templateName: 'Biên bản ghi nhận tài sản hỏng', businessModule: 'DAMAGE', description: 'Ghi nhận sự cố hỏng hóc' },
  { templateCode: 'BM04', templateName: 'Biên bản thanh lý tài sản', businessModule: 'LIQUIDATION', description: 'Dùng để giảm trừ tài sản khi thanh lý' },
  { templateCode: 'BM05', templateName: 'Biên bản tiêu hủy tài sản', businessModule: 'DISPOSAL', description: 'Dùng cho hình thức tiêu hủy' },
  { templateCode: 'BM06', templateName: 'Biên bản điều chuyển tài sản', businessModule: 'TRANSFER', description: 'Điều chuyển giữa các bộ phận/vị trí' },
  { templateCode: 'BM07', templateName: 'Phiếu yêu cầu tài sản', businessModule: 'REQUEST', description: 'Ghi nhận yêu cầu cấp phát/sửa chữa/mất' },
  { templateCode: 'BM08', templateName: 'Tờ trình chủ trương', businessModule: 'PROPOSAL', description: 'Phê duyệt kế hoạch vượt định mức' },
  { templateCode: 'BM09', templateName: 'Biên bản kiểm tra hiện trạng', businessModule: 'INSPECTION', description: 'Kiểm tra trước điều chuyển/nghiệm thu' },
  { templateCode: 'BM10', templateName: 'Biên bản bảo dưỡng và sửa chữa', businessModule: 'REPAIR', description: 'Phục vụ sửa chữa, bảo trì, nâng cấp' },
  { templateCode: 'BM11', templateName: 'Quyết định thành lập Hội đồng', businessModule: 'COUNCIL', description: 'Hội đồng kiểm kê, thanh lý, xử lý' },
  { templateCode: 'BM12', templateName: 'Biên bản kiểm kê tài sản', businessModule: 'INVENTORY', description: 'Biên bản chốt số liệu kiểm kê' },
  { templateCode: 'BM13', templateName: 'Biên bản ghi nhận mất tài sản', businessModule: 'LOST', description: 'Khuyến nghị bổ sung cho nghiệp vụ mất' },
];

async function main() {
  console.log('Seeding document templates...');
  for (const t of templates) {
    await prisma.documentTemplate.upsert({
      where: { templateCode: t.templateCode },
      update: t,
      create: t,
    });
  }
  console.log('Templates seeded successfully.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
