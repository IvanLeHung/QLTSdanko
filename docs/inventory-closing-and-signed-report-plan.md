# Inventory Closing & Signed Report Plan V2

## Mục tiêu

Hoàn thiện nghiệp vụ kiểm kê tài sản theo hướng có thể chốt số liệu theo ngày, theo phiên kiểm kê hoặc theo phạm vi tổ chức; nhập danh sách người ký; khóa dữ liệu đã chốt; xuất/lưu báo cáo chính thức; và cho phép mở lại có kiểm soát.

Phạm vi này là một business feature riêng. Không thay đổi luồng kiểm kê hiện tại cho đến khi migration, API, UI và kiểm thử dữ liệu thật được hoàn tất.

## Hiện trạng

- `InventoryCheck` quản lý đợt kiểm kê.
- `InventorySession` quản lý phiên/địa điểm kiểm kê, đã có `checkerName`, `representativeName`, `completedAt`.
- `InventoryItem` và `InventoryDetail` lưu kết quả kiểm kê.
- Đã có export theo thời gian qua `/inventory/export-by-time`.
- `InventoryDetail.tsx` đã có report center UI và preview biên bản, nhưng lịch sử file/report hiện còn thiên về frontend state, chưa phải hồ sơ chốt chính thức.

## Vấn đề cần giải quyết

- Chưa có thực thể "biên bản chốt kiểm kê" có mã số, ngày chốt, phạm vi, người chốt và trạng thái ký.
- Chưa hỗ trợ chốt từng phần theo ngày, phiên kiểm kê, phòng ban, dự án hoặc vị trí.
- Chưa có quan hệ rõ giữa biên bản chốt, phiên kiểm kê, item/detail và phạm vi.
- Chưa có kiểm tra overlap scope đủ chính xác.
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
- `closingCode`: unique, format đề xuất `BBKK-{YEAR}-{INVENTORY_CODE}-{SEQ}`
- `closingDate`: ngày chốt trên biên bản
- `closedAt`
- `closedBy`
- `status`: `DRAFT`, `PENDING_SIGN`, `SIGNED`, `FINAL`, `REOPENED`, `CANCELLED`
- `totalItems`
- `matchedItems`
- `discrepancyItems`
- `missingItems`
- `extraItems`
- `damagedItems`
- `differencePercent`
- `summaryJson`: giữ dữ liệu snapshot mở rộng nếu cần
- `closingNote`
- `forceCloseReason`
- `version`: default `1`
- `reopenCount`
- `reopenHistory`: JSON array `{ reopenedAt, reopenedBy, reason }`
- `createdAt`
- `updatedAt`

Quan hệ:

- `inventoryCheck`
- `scopes`
- `signers`
- `reports`

### InventoryClosingScope

Cho phép một biên bản chốt nhiều phạm vi. Không chỉ dùng `scopeValue` dạng string; cần foreign key cụ thể để query, validate overlap và khóa dữ liệu chính xác.

Fields đề xuất:

- `id`
- `closingId`
- `scopeType`: `DAILY`, `SESSION`, `DEPARTMENT`, `PROJECT`, `LOCATION`, `FULL`
- `sessionId`: nullable, dùng khi chốt theo phiên kiểm kê
- `departmentId`: nullable, dùng khi chốt theo phòng ban
- `locationId`: nullable, dùng khi chốt theo vị trí
- `projectId`: nullable, dùng khi chốt theo dự án
- `scopeDate`: nullable, dùng khi chốt theo ngày
- `scopeLabel`: tên hiển thị snapshot để báo cáo không bị đổi khi master data đổi tên
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

Gợi ý index:

- `(closingId)`
- `(scopeType, scopeDate)`
- `(sessionId)`
- `(departmentId, scopeDate)`
- `(locationId, scopeDate)`
- `(projectId, scopeDate)`

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
- `template`: `standard`, `ministry`, `corporate`
- `paperSize`: `A4`, `A3`, `LETTER`
- `orientation`: `portrait`, `landscape`
- `includeSignatures`
- `includePhotos`
- `language`: `vi`, `en`
- `parametersJson`
- `version`
- `isOutdated`
- `createdBy`
- `createdAt`
- `rowCount`
- `checksum`

### Bổ sung lock vào dữ liệu kiểm kê

Thêm nullable columns để không phá dữ liệu cũ:

- `InventoryItem.lockedAt`
- `InventoryItem.lockedBy`
- `InventoryItem.closingScopeId`
- `InventoryDetail.lockedAt`
- `InventoryDetail.lockedBy`
- `InventoryDetail.closingScopeId`

Quy tắc đề xuất: lock ở level `InventoryDetail` là chính. `InventoryItem` chỉ dùng để tổng hợp trạng thái nếu cần.

## Business Rules

### Quy tắc chốt

- Không cho chốt scope bị overlap với scope đã `FINAL`.
- Cho phép chốt từng phần, phần chưa chốt vẫn được kiểm kê/sửa tiếp.
- Nếu scope còn tài sản `PENDING`, mặc định không cho chốt.
- Có thể force close nếu người dùng có quyền và nhập lý do.
- Khi `FINAL`, khóa toàn bộ item/detail thuộc scope bằng `lockedAt`, `lockedBy`, `closingScopeId`.
- Sau khi `FINAL`, không cho sửa kết quả, undo scan hoặc cập nhật dữ liệu thực tế trong scope đã chốt.
- Mở lại cần quyền Admin/Quản lý kiểm kê, bắt buộc nhập lý do.
- Đề xuất chỉ được mở lại trong 24h sau khi `FINAL`, trừ `SUPER_ADMIN`.
- Giới hạn mở lại tối đa 3 lần/đợt, hoặc bỏ giới hạn với `SUPER_ADMIN`.
- Nếu sai lệch > 5% tổng tài sản trong scope, cảnh báo cần kiểm kê lại.
- Nếu tài sản mất giá trị cao, tạo cảnh báo/incident riêng ở phase sau.

### Quy tắc trình tự

- Nếu chốt theo ngày trong đợt kiểm kê liên tục, nên chốt theo thứ tự thời gian.
- Không cho chốt toàn đợt nếu còn phòng ban/vị trí/phiên bắt buộc chưa xử lý.
- Nếu đã có `FULL FINAL`, không cho tạo thêm scope chốt con cho cùng đợt.

### Quy tắc người ký

- Biên bản phải có ít nhất 2 người ký: người kiểm kê và đại diện bộ phận.
- Chốt theo phòng ban: bắt buộc `CHECKER`, `DEPARTMENT_REP`.
- Chốt toàn đợt: bắt buộc `INVENTORY_HEAD`, `ACCOUNTANT`, `DIRECTOR`.
- Người chốt không nên là người ký cùng vai trò, trừ trường hợp `DIRECTOR` hoặc được cấu hình riêng.

### Quy tắc báo cáo

- Summary phải tính từ DB tại thời điểm `FINAL`, không dùng cached frontend state.
- Khi reopen, đánh dấu report cũ là `isOutdated = true` và bắt buộc sinh lại nếu muốn dùng làm hồ sơ chính thức.
- File chính thức cần checksum để phát hiện thay đổi sau khi xuất.

## Validate overlap scope

Overlap không được check bằng string `scopeValue`. Cần xác định theo foreign key và tập item/detail thực tế.

Logic đề xuất:

1. Lấy toàn bộ `InventoryClosingScope` thuộc cùng `inventoryCheckId` và closing đang `FINAL`.
2. Với từng scope mới, so với scope đã final:
   - `FULL` overlap với mọi scope.
   - `DAILY` overlap nếu cùng `scopeDate`.
   - `SESSION` overlap nếu cùng `sessionId`.
   - `DEPARTMENT` overlap nếu cùng `departmentId`; nếu cả hai có `scopeDate` thì chỉ overlap khi cùng ngày.
   - `LOCATION` overlap nếu cùng `locationId`; nếu cả hai có `scopeDate` thì chỉ overlap khi cùng ngày.
   - `PROJECT` overlap nếu cùng `projectId`; nếu cả hai có `scopeDate` thì chỉ overlap khi cùng ngày.
3. Sau check cấp scope, truy vấn item/detail nằm trong cả hai phạm vi để trả về danh sách `overlappingItemIds`.
4. API validate trả rõ biên bản đang bị đụng: `existingClosingCode`, `existingScope`, `overlappingItems`.

## API đề xuất

### Core closing

- `POST /api/inventory/:id/closing/validate`
- `POST /api/inventory/:id/closing`
- `GET /api/inventory/:id/closing-records`
- `GET /api/inventory/closing-records/:closingId`
- `POST /api/inventory/closing-records/:closingId/finalize`

### Validation

- `POST /api/inventory/:id/closing/validate-scope`
- `POST /api/inventory/:id/closing/validate-items`
- `GET /api/inventory/:id/closing/suggested-scopes`

### Signing

- `POST /api/inventory/closing-records/:closingId/sign`
- `POST /api/inventory/:id/closing/batch-sign`

### Report

- `POST /api/inventory/closing-records/:closingId/export`
- `GET /api/inventory/closing-records/:closingId/reports`
- `POST /api/inventory/closing-records/:closingId/generate-report`
- `GET /api/inventory/closing-records/:closingId/report-status`

### Reopen

- `POST /api/inventory/closing-records/:closingId/request-reopen`
- `POST /api/inventory/closing-records/:closingId/approve-reopen`
- `POST /api/inventory/closing-records/:closingId/reopen`

### Audit

- `GET /api/inventory/:id/audit-log`
- `GET /api/inventory/closing-records/:closingId/history`

## UI Flow đề xuất

### Closing Wizard

Step 1: Chọn phạm vi chốt

- Chọn theo ngày, phiên kiểm kê, phòng ban, dự án, vị trí hoặc toàn bộ đợt.
- Hiển thị số lượng tài sản, đã kiểm, chưa kiểm, sai lệch.
- Cảnh báo scope chưa hoàn tất hoặc overlap.
- Hiển thị trạng thái scope: `Chốt được`, `Còn phần chưa chốt`, `Đã chốt toàn bộ`, `Bị overlap`.

Step 2: Rà soát sai lệch

- Nhóm khớp.
- Sai vị trí/người dùng.
- Thiếu/mất.
- Hỏng.
- Ngoài sổ.
- Chọn hành động đề xuất cho từng nhóm:
  - Thiếu/mất: tạo báo mất, tìm ở vị trí khác, đánh dấu mất vĩnh viễn.
  - Ngoài sổ: đăng ký tài sản, chuyển bộ phận khác, đánh dấu tài sản phát hiện.
  - Hỏng: tạo yêu cầu sửa chữa, đề xuất thanh lý, cập nhật tình trạng.

Step 3: Người ký

- Nhập người ký động.
- Gợi ý role bắt buộc theo scope.
- Hỗ trợ upload chữ ký ảnh hoặc signature pad ở phase sau.

Step 4: Xác nhận và chốt

- Hiển thị summary.
- Checkbox xác nhận số liệu cuối cùng.
- Nút `Chốt & Xuất biên bản`.

### Trạng thái cần hiển thị trên UI

- Tiến độ chốt theo ngày: đã chốt/tổng ngày.
- Tiến độ chốt theo phòng ban: `CLOSED`, `IN_PROGRESS`, `PENDING`.
- Cảnh báo scope đang bị khóa.
- Cảnh báo report đã cũ sau khi reopen.
- Nút xem lịch sử mở lại và lịch sử file xuất.

## Báo cáo cần chuẩn hóa

- `RPT-01`: Báo cáo tổng hợp kiểm kê.
- `RPT-02`: Biên bản kiểm kê theo phòng ban/phạm vi.
- `RPT-03`: Danh mục tài sản sau kiểm kê.
- `RPT-04`: Báo cáo sai lệch chi tiết.
- `RPT-05`: Báo cáo tài sản ngoài sổ.
- `RPT-06`: Báo cáo tài sản thiếu/mất.
- `RPT-07`: Biên bản chốt số liệu kiểm kê có người ký.

Metadata bắt buộc:

- `reportCode`
- `reportType`
- `generatedAt`
- `generatedBy`
- `closingRecordId`
- `checksum`
- `parameters`
- `version`

## Migration Strategy

Triển khai theo hướng an toàn dữ liệu:

1. Tạo bảng mới:
   - `inventory_closing_records`
   - `inventory_closing_scopes`
   - `inventory_closing_signers`
   - `inventory_report_files`
2. Thêm nullable columns vào bảng hiện có:
   - `inventory_items.locked_at`
   - `inventory_items.locked_by`
   - `inventory_items.closing_scope_id`
   - `inventory_details.locked_at`
   - `inventory_details.locked_by`
   - `inventory_details.closing_scope_id`
3. Backfill cho các đợt kiểm kê đã `COMPLETED`:
   - Tạo closing record mặc định ở trạng thái `FINAL` hoặc `SIGNED` tùy dữ liệu thực tế.
   - Tạo scope `FULL` cho đợt cũ.
   - Tính lại summary từ DB.
4. Verify dữ liệu backfill:
   - Đếm tổng item/detail trước và sau migration.
   - So sánh summary với báo cáo hiện có.
5. Sau khi pass staging mới cân nhắc constraints chặt hơn.

## Performance & Concurrency

- Chốt scope lớn phải xử lý lock theo batch, đề xuất `BATCH_SIZE = 100`.
- Dùng transaction khi tạo closing record, scope, summary và lock dữ liệu.
- Dùng optimistic locking bằng `version` để tránh 2 người cùng chốt một scope.
- Mỗi thao tác scan/update kết quả phải kiểm tra `lockedAt` trước khi ghi.
- Index cần có:
  - `inventory_details.closing_scope_id`
  - `inventory_items.closing_scope_id`
  - `inventory_closing_scopes.scope_type`
  - `inventory_closing_scopes.department_id, scope_date`
  - `inventory_closing_scopes.location_id, scope_date`
  - `inventory_closing_scopes.project_id, scope_date`

## Phân phase triển khai

### Phase A: Core Closing - 2 tuần

Week 1:

- Migration model closing/scope/signer/report file.
- Basic API create/list/detail closing.
- Summary calculation từ DB.

Week 2:

- Validate scope overlap.
- Validate pending items.
- Lock/unlock dữ liệu theo scope.
- Audit log cho chốt/mở lại.

### Phase B: Signing & Report Storage - 2 tuần

Week 3:

- Quản lý người ký.
- Sign flow.
- Rule bắt buộc người ký theo scope.

Week 4:

- Generate report.
- Lưu `InventoryReportFile`.
- Tải lại file đã xuất.
- Checksum và report versioning.

### Phase C: Partial Closing & Reopen - 2 tuần

Week 5:

- Chốt từng phần theo ngày/session/phòng ban/vị trí/dự án.
- Suggested scopes.
- Batch close.

Week 6:

- Reopen workflow.
- Request/approve reopen.
- Reopen history.
- Mark report outdated khi reopen.

### Phase D: UI Wizard & Polish - 2 tuần

Week 7:

- Closing wizard.
- Scope progress.
- Discrepancy review actions.

Week 8:

- Preview biên bản.
- Signature pad/upload chữ ký.
- Tablet/mobile responsive.
- Regression test.

Tổng: 8 tuần. Có thể rút xuống 6 tuần nếu team mạnh và ưu tiên Phase A/B trước.

## Regression Test

- Tạo đợt kiểm kê.
- Tạo phiên kiểm kê.
- Scan QR.
- Cập nhật kết quả thực tế.
- Thêm tài sản ngoài sổ.
- Chốt theo ngày.
- Chốt theo phiên kiểm kê.
- Chốt theo phòng ban.
- Chốt theo vị trí/dự án.
- Chốt overlap phải báo lỗi và trả danh sách item bị overlap.
- Chốt khi còn pending phải cảnh báo.
- Force close có lý do.
- Nhập người ký.
- Ký thiếu người bắt buộc phải báo lỗi.
- Xuất Excel/PDF/ZIP.
- Kiểm tra scope đã chốt không sửa được.
- Mở lại scope đã chốt.
- Report cũ sau reopen phải bị đánh dấu outdated.
- Audit log đầy đủ.
- Hai user cùng chốt một scope: chỉ một giao dịch thành công.

## Rủi ro và lưu ý

- Dữ liệu hiện có đã có `InventoryCheck`, `InventorySession`, `InventoryItem`, `InventoryDetail`; migration cần chạy thử trên staging trước.
- Không nên khóa toàn bộ đợt nếu chỉ chốt từng phòng ban/ngày.
- Nếu khóa ở `InventoryItem` quá sớm có thể chặn scan hợp lệ ở session khác; ưu tiên lock `InventoryDetail`.
- Export PDF nên dùng template server-side để tránh khác biệt trình duyệt.
- Report history hiện ở frontend cần thay bằng dữ liệu thật từ `InventoryReportFile`.
- Nếu dùng chữ ký điện tử thật, cần thêm audit, checksum, OTP/USB token hoặc provider ký số hợp lệ.
- Ảnh chữ ký chỉ phù hợp xác nhận nội bộ, không thay thế chữ ký số có giá trị pháp lý nếu công ty yêu cầu.
- Summary không được lấy từ cache khi finalize.
- Khi reopen phải đánh dấu report cũ là outdated và buộc xuất lại.
