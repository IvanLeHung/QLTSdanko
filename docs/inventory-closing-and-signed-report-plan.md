# Inventory Closing & Signed Report Plan

## Mục tiêu

Hoàn thiện nghiệp vụ kiểm kê tài sản theo hướng có thể chốt số liệu theo ngày hoặc theo phạm vi, nhập danh sách người ký, khóa dữ liệu đã chốt, và xuất/lưu báo cáo chính thức.

Phạm vi này là pure business feature, cần triển khai thành phase riêng. Không thay đổi luồng kiểm kê hiện có cho đến khi migration/API/UI được kiểm thử đầy đủ.

## Hiện trạng

- `InventoryCheck` quản lý đợt kiểm kê.
- `InventorySession` quản lý phiên/địa điểm kiểm kê, đã có `checkerName`, `representativeName`, `completedAt`.
- `InventoryItem` và `InventoryDetail` lưu kết quả kiểm kê.
- Đã có export theo thời gian qua `/inventory/export-by-time`.
- `InventoryDetail.tsx` đã có report center UI và preview biên bản, nhưng phần lịch sử file/report hiện còn thiên về frontend state, chưa phải hồ sơ chốt chính thức.

## Vấn đề cần giải quyết

- Chưa có thực thể "biên bản chốt kiểm kê" có mã số, ngày chốt, phạm vi, người chốt và trạng thái ký.
- Chưa hỗ trợ chốt từng phần theo ngày/phòng ban/dự án/vị trí.
- Chưa có khóa dữ liệu theo scope đã chốt.
- Chưa có danh sách người ký ở cấp biên bản chốt.
- Chưa có lịch sử file báo cáo được lưu và audit rõ ràng.
- Chưa có nghiệp vụ mở lại phạm vi đã chốt có kiểm soát.

## Model đề xuất

### InventoryClosingRecord

Lưu biên bản chốt kiểm kê.

Fields đề xuất:

- `id`
- `inventoryCheckId`
- `closingCode`
- `closingDate`
- `closedAt`
- `closedBy`
- `status`: `DRAFT`, `PENDING_SIGN`, `SIGNED`, `FINAL`, `REOPENED`, `CANCELLED`
- `summaryJson`
- `closingNote`
- `forceCloseReason`
- `reopenCount`
- `createdAt`
- `updatedAt`

### InventoryClosingScope

Cho phép một biên bản chốt nhiều phạm vi.

Fields đề xuất:

- `id`
- `closingId`
- `scopeType`: `DAILY`, `DEPARTMENT`, `PROJECT`, `LOCATION`, `FULL`
- `scopeValue`
- `scopeDate`
- `itemCount`
- `matchedCount`
- `differenceCount`
- `pendingCount`
- `extraCount`
- `missingCount`
- `damagedCount`
- `status`: `PARTIAL`, `COMPLETE`
- `lockedAt`
- `lockedBy`

### InventoryClosingSigner

Lưu người ký biên bản.

Fields đề xuất:

- `id`
- `closingId`
- `signerRole`: `CHECKER`, `DEPARTMENT_REP`, `INVENTORY_HEAD`, `ACCOUNTANT`, `DIRECTOR`, `OTHER`
- `fullName`
- `position`
- `department`
- `signatureImage`
- `signedAt`
- `signStatus`: `PENDING`, `SIGNED`, `REJECTED`
- `note`

### InventoryReportFile

Lưu file báo cáo đã xuất.

Fields đề xuất:

- `id`
- `closingId`
- `inventoryCheckId`
- `reportCode`
- `reportType`: `SUMMARY`, `DEPARTMENT_MINUTES`, `POST_INVENTORY_LIST`, `DISCREPANCY`, `EXTRA_ITEMS`, `MISSING_ITEMS`, `SIGNED_CLOSING`
- `fileName`
- `fileUrl`
- `fileType`: `XLSX`, `PDF`, `ZIP`
- `createdBy`
- `createdAt`
- `rowCount`
- `checksum`

## Business Rules

- Không cho chốt scope bị overlap với scope đã `FINAL`.
- Cho phép chốt từng phần, phần chưa chốt vẫn được kiểm kê/sửa tiếp.
- Nếu scope còn tài sản `PENDING`, mặc định không cho chốt.
- Có thể force close nếu người dùng có quyền và nhập lý do.
- Khi chốt, khóa item/detail thuộc scope đó bằng `lockedAt`, `lockedBy`, `closingId`.
- Sau khi `FINAL`, không cho sửa kết quả, undo scan, cập nhật thực tế trong scope đã chốt.
- Mở lại cần quyền Admin/Quản lý kiểm kê, bắt buộc nhập lý do.
- Giới hạn mở lại: đề xuất tối đa 3 lần/đợt, hoặc bỏ giới hạn với `SUPER_ADMIN`.
- Nếu sai lệch > 5% tổng tài sản trong scope, cảnh báo cần kiểm kê lại.
- Nếu tài sản mất giá trị cao, tạo cảnh báo/incident riêng ở phase sau.

## API đề xuất

- `POST /api/inventory/:id/closing/validate`
- `POST /api/inventory/:id/closing`
- `GET /api/inventory/:id/closing-records`
- `GET /api/inventory/closing-records/:closingId`
- `POST /api/inventory/closing-records/:closingId/sign`
- `POST /api/inventory/closing-records/:closingId/finalize`
- `POST /api/inventory/closing-records/:closingId/reopen`
- `POST /api/inventory/closing-records/:closingId/export`
- `GET /api/inventory/closing-records/:closingId/reports`

## UI Flow đề xuất

### Closing Wizard

Step 1: Chọn phạm vi chốt

- Chọn theo ngày, phòng ban, dự án, vị trí hoặc toàn bộ đợt.
- Hiển thị số lượng tài sản, đã kiểm, chưa kiểm, sai lệch.
- Cảnh báo scope chưa hoàn tất hoặc overlap.

Step 2: Rà soát sai lệch

- Nhóm khớp.
- Sai vị trí/người dùng.
- Thiếu/mất.
- Hỏng.
- Ngoài sổ.
- Chọn hành động đề xuất cho từng nhóm.

Step 3: Người ký

- Nhập người ký động.
- Gợi ý role bắt buộc theo scope.
- Hỗ trợ upload chữ ký ảnh hoặc signature pad ở phase sau.

Step 4: Xác nhận và chốt

- Hiển thị summary.
- Checkbox xác nhận số liệu cuối cùng.
- Nút `Chốt & Xuất biên bản`.

## Báo cáo cần chuẩn hóa

- `RPT-01`: Báo cáo tổng hợp kiểm kê.
- `RPT-02`: Biên bản kiểm kê theo phòng ban/phạm vi.
- `RPT-03`: Danh mục tài sản sau kiểm kê.
- `RPT-04`: Báo cáo sai lệch chi tiết.
- `RPT-05`: Báo cáo tài sản ngoài sổ.
- `RPT-06`: Báo cáo tài sản thiếu/mất.
- `RPT-07`: Biên bản chốt số liệu kiểm kê có người ký.

## Phân phase triển khai

### Phase A: Core Closing

- Migration model closing/scope/signer/report file.
- API validate closing.
- API create closing record.
- Lock dữ liệu theo scope.
- Audit log cho chốt/mở lại.

### Phase B: Signing & Report Storage

- Quản lý người ký.
- Export Excel/PDF từ closing record.
- Lưu `InventoryReportFile`.
- Tải lại file đã xuất.

### Phase C: Partial Closing & Reopen

- Chốt từng phần.
- Kiểm tra overlap scope.
- Mở lại đúng scope.
- Reopen history.

### Phase D: UI Wizard & Polish

- Closing wizard.
- Preview biên bản.
- Signature pad/upload chữ ký.
- Tablet/mobile responsive.

## Regression Test

- Tạo đợt kiểm kê.
- Tạo phiên kiểm kê.
- Scan QR.
- Cập nhật kết quả thực tế.
- Thêm tài sản ngoài sổ.
- Chốt theo ngày.
- Chốt theo phòng ban.
- Chốt overlap phải báo lỗi.
- Chốt khi còn pending phải cảnh báo.
- Force close có lý do.
- Nhập người ký.
- Ký thiếu người bắt buộc phải báo lỗi.
- Xuất Excel/PDF/ZIP.
- Kiểm tra scope đã chốt không sửa được.
- Mở lại scope đã chốt.
- Audit log đầy đủ.

## Rủi ro và lưu ý

- Cần migration cẩn thận vì dữ liệu kiểm kê hiện đã có `InventoryCheck`, `InventorySession`, `InventoryItem`, `InventoryDetail`.
- Không nên khóa toàn bộ đợt nếu chỉ chốt từng phòng ban/ngày.
- Export PDF nên dùng template server-side để tránh khác biệt trình duyệt.
- Report history hiện ở frontend cần thay bằng dữ liệu thật từ `InventoryReportFile`.
- Nếu dùng chữ ký điện tử thật, cần thêm audit, checksum và chính sách khóa nội dung biên bản.
