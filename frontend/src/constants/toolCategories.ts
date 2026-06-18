export const TOOL_CATEGORY_TREE: Record<string, string[]> = {
  '01 Nội thất': ['Bàn làm việc', 'Ghế văn phòng', 'Tủ tài liệu / Kệ sách', 'Sofa / Bàn trà', 'Khác'],
  '02 Decor / Trang trí': ['Decor sự kiện', 'Tranh treo tường', 'Hoa / Chậu cây', 'Đèn trang trí', 'Concept Noel/Tết', 'Khác'],
  '03 Bất động sản - Tòa nhà': ['Thiết bị tòa nhà', 'Hệ thống chiếu sáng', 'Hệ thống cửa/khóa', 'Trang thiết bị vệ sinh', 'Khác'],
  '04 Marketing / POSM': ['Standee / Banner', 'Backdrop / Khung backdrop', 'Quầy kệ trưng bày', 'Vật phẩm quảng cáo', 'Khác'],
  '05 Branding': ['Ấn phẩm thương hiệu', 'Đồng phục', 'Biển hiệu công ty', 'Khác'],
  '06 Event Equipment': ['Thiết bị âm thanh', 'Thiết bị ánh sáng', 'Sân khấu / Bục phát biểu', 'Khung giàn truss', 'Phụ kiện sự kiện', 'Khác'],
  '07 F&B / Tiệc': ['Bàn ghế tiệc', 'Ly / Cốc / Chén / Dĩa', 'Dụng cụ bếp', 'Khay phục vụ', 'Khác'],
  '08 Dịch vụ vận hành': ['Xe đẩy hàng', 'Thang nhôm', 'Thiết bị vệ sinh', 'Dụng cụ sửa chữa nhanh', 'Khác'],
  '09 IT & Digital': ['Máy tính xách tay / Laptop', 'Máy tính để bàn', 'Màn hình máy tính', 'Thiết bị mạng (Router/Switch)', 'Máy in / Máy photocopy / Scan', 'Phụ kiện máy tính', 'Khác'],
  '10 Media Production': ['Máy ảnh', 'Máy quay phim', 'Ống kính (Lens)', 'Chân máy (Tripod/Gimbal)', 'Đèn studio / Tấm phản sáng', 'Mic thu âm', 'Khác'],
  '11 Kho vận': ['Xe nâng tay', 'Pallet nhựa/gỗ', 'Thùng nhựa / Hộp chứa', 'Cân điện tử', 'Khác'],
  '12 Costume / Đạo cụ': ['Trang phục biểu diễn', 'Đồ hóa trang / Mặt nạ', 'Vũ khí giả / Đồ gỗ diễn', 'Khác'],
  '13 Công cụ kỹ thuật': ['Máy khoan / Máy bắt vít', 'Máy cắt / Máy mài', 'Bộ tua vít / Cờ lê / Mỏ lết', 'Thiết bị đo điện / nhiệt độ', 'Khác'],
  '14 Safety / PCCC': ['Bình chữa cháy', 'Vòi / Lăng chữa cháy', 'Đèn chỉ dẫn thoát hiểm (Exit)', 'Hộp sơ cứu / Túi cứu thương', 'Khác'],
  '15 Vật tư tiêu hao': ['Giấy in / Văn phòng phẩm', 'Băng keo / Màng PE', 'Pin / Bóng đèn dự phòng', 'Khác'],
  '16 Merchandise': ['Quà tặng đối tác', 'Áo thun / Mũ thương hiệu', 'Khác'],
  '99 Khác': ['Chưa phân loại']
};

export const buildToolCategory = (category1?: string, category2?: string) => {
  if (!category1) return '';
  return category2 ? `${category1} - ${category2}` : category1;
};

export const splitToolCategory = (category?: string | null) => {
  const value = (category || '').trim();
  const category1 = Object.keys(TOOL_CATEGORY_TREE).find(parent => value === parent || value.startsWith(`${parent} - `)) || value;
  const category2 = category1 && value.startsWith(`${category1} - `)
    ? value.slice(category1.length + 3)
    : '';
  return { category1, category2 };
};
