# Inventory Closing & Signed Report Plan V4

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

### Response format chuẩn

Tất cả API closing nên dùng cùng response envelope để frontend xử lý lỗi/alert thống nhất:

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

Với lỗi nghiệp vụ:

```json
{
  "success": false,
  "error": {
    "code": "CLOSING_SCOPE_OVERLAP",
    "message": "Phạm vi chốt bị overlap với biên bản BBKK-2026-001",
    "details": {}
  }
}
```

Response đề xuất cho `POST /api/inventory/:id/closing/validate-scope`:

```json
{
  "success": true,
  "data": {
    "isValid": false,
    "overlaps": [
      {
        "existingClosingCode": "BBKK-2026-001",
        "existingScope": {
          "id": "scope-123",
          "type": "DEPARTMENT",
          "departmentId": "dept-it",
          "departmentName": "Phòng IT",
          "scopeDate": "2026-06-15"
        },
        "overlappingItems": [
          {
            "itemId": "item-456",
            "assetCode": "TS-2026-001",
            "assetName": "Laptop Dell XPS",
            "currentStatus": "LOCKED"
          }
        ],
        "overlapPercentage": 45
      }
    ],
    "suggestions": [
      "Phòng IT ngày 15/06 đã có biên bản chốt",
      "Điều chỉnh phạm vi hoặc yêu cầu mở lại biên bản BBKK-2026-001"
    ]
  }
}
```

### Error codes

- `CLOSING_SCOPE_OVERLAP`: HTTP `409`, phạm vi bị overlap với biên bản đã chốt.
- `CLOSING_PENDING_ITEMS`: HTTP `422`, còn tài sản chưa kiểm kê hoặc chưa xử lý.
- `CLOSING_INSUFFICIENT_SIGNERS`: HTTP `422`, thiếu người ký bắt buộc.
- `ITEM_LOCKED`: HTTP `423`, item/detail đã bị khóa bởi biên bản chốt.
- `REOPEN_NOT_ALLOWED`: HTTP `403`, không đủ điều kiện mở lại.
- `MAX_REOPEN_EXCEEDED`: HTTP `403`, vượt quá số lần mở lại cho phép.
- `INVALID_CLOSING_TRANSITION`: HTTP `409`, chuyển trạng thái không hợp lệ.
- `REPORT_GENERATION_FAILED`: HTTP `500`, sinh báo cáo lỗi.
- `CLOSING_SCOPE_TOO_LARGE`: HTTP `202`, scope lớn được chuyển sang async job.
- `REPORT_SERVICE_UNAVAILABLE`: HTTP `202`, closing vẫn final nhưng report được queue lại.
- `INVALID_CLOSING_INPUT`: HTTP `422`, dữ liệu đầu vào không hợp lệ.

### Core closing

- `POST /api/inventory/:id/closing/validate`
- `POST /api/inventory/:id/closing`
- `GET /api/inventory/:id/closing-records`
- `GET /api/inventory/closing-records/:closingId`
- `POST /api/inventory/closing-records/:closingId/finalize`
- `POST /api/inventory/closing-records/:closingId/cancel-scope`

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

### Dashboard & monitoring

- `GET /api/inventory/:id/closing/statistics`
- `GET /api/inventory/closing/health`

Response đề xuất cho cancel scope:

```json
{
  "success": true,
  "data": {
    "cancelledScopeId": "scope-456",
    "remainingScopes": 2,
    "closingStatus": "DRAFT"
  }
}
```

Chỉ cho `cancel-scope` khi closing còn `DRAFT` hoặc `REOPENED`. Không cho hủy scope đã `FINAL` nếu chưa đi qua reopen workflow.

Response đề xuất cho statistics:

```json
{
  "success": true,
  "data": {
    "totalScopes": 15,
    "closedScopes": 12,
    "pendingScopes": 3,
    "totalItems": 5000,
    "lockedItems": 4200,
    "discrepancyRate": 4.5,
    "averageClosingTime": "2.5 hours",
    "closingTrend": [
      { "date": "2026-06-15", "closed": 3, "items": 1200 },
      { "date": "2026-06-16", "closed": 5, "items": 1800 }
    ]
  }
}
```

Response đề xuất cho health check:

```json
{
  "success": true,
  "data": {
    "service": "inventory-closing",
    "status": "healthy",
    "checks": {
      "database": "connected",
      "reportGenerator": "available",
      "eventBus": "connected",
      "storage": "available"
    },
    "metrics": {
      "activeClosings": 5,
      "pendingReports": 2,
      "failedJobs": 0,
      "averageLockTime": "1.2s"
    }
  }
}
```

## Input Validation

Validation cần chạy trước khi tạo/chốt biên bản:

- `closingDate` bắt buộc.
- `closingDate` không được ở tương lai.
- `closingDate` không được trước ngày bắt đầu đợt kiểm kê.
- `forceCloseReason` bắt buộc khi còn pending item mà vẫn force close.
- `forceCloseReason` tối thiểu 20 ký tự để tránh lý do hình thức.
- Không cho trùng role người ký trong cùng biên bản, trừ role `OTHER`.
- Người ký role `CHECKER` nên khớp với người kiểm kê trong session hoặc danh sách người được phân công.
- Scope phải có đủ khóa ngoại tương ứng với `scopeType`.
- Không cho scope rỗng item.
- Không cho tạo closing không có scope.

## State Machine

Trạng thái closing phải được validate tập trung ở service layer, không để từng endpoint tự xử lý rời rạc.

| From | To | Điều kiện |
| --- | --- | --- |
| `DRAFT` | `PENDING_SIGN` | Đã có scope hợp lệ và đủ danh sách người ký bắt buộc |
| `DRAFT` | `CANCELLED` | Người tạo hoặc Admin hủy |
| `PENDING_SIGN` | `SIGNED` | Tất cả người ký bắt buộc đã ký |
| `PENDING_SIGN` | `DRAFT` | Admin rút lại để sửa |
| `PENDING_SIGN` | `CANCELLED` | Admin hủy |
| `SIGNED` | `FINAL` | Không còn pending item hoặc force close có lý do |
| `SIGNED` | `CANCELLED` | Admin hủy trước khi final |
| `FINAL` | `REOPENED` | Trong 24h hoặc `SUPER_ADMIN`, có lý do |
| `REOPENED` | `DRAFT` | Unlock scope và chỉnh lại hồ sơ |
| `REOPENED` | `PENDING_SIGN` | Re-close với người ký giữ nguyên hoặc cập nhật |

Quy tắc bổ sung:

- `FINAL` là immutable, chỉ được thay đổi qua workflow reopen.
- `REOPENED` yêu cầu approval nếu tổ chức bật approval workflow.
- `reopenCount` tối đa 3 lần, trừ `SUPER_ADMIN`.
- Mọi transition phải ghi audit log.

## Event & Notification

Các event cần emit để mở rộng thông báo, audit, automation và tích hợp sau này:

- `closing:created`: tạo audit log, thông báo người liên quan.
- `closing:ready_for_sign`: gửi nhắc ký, tạo approval/sign task.
- `closing:signed`: cập nhật tiến độ ký.
- `closing:finalized`: khóa item, sinh báo cáo async, thông báo stakeholder.
- `closing:reopened`: unlock item, đánh dấu report cũ outdated, tạo audit/incident.
- `closing:high_discrepancy`: tạo alert quản lý, gợi ý kiểm kê lại.
- `closing:report_generated`: cập nhật report status và gửi thông báo file sẵn sàng.

Kênh thông báo:

- In-app notification.
- Email ở phase sau.
- Mobile push ở phase sau nếu mobile app đã bật.

## Graceful Degradation

Closing không nên phụ thuộc cứng vào report generation service. Nếu service sinh báo cáo lỗi hoặc storage tạm thời không sẵn sàng:

- Vẫn cho phép closing chuyển `FINAL` nếu dữ liệu, lock và audit đã thành công.
- Tạo pending report job để sinh lại khi service phục hồi.
- Trả warning rõ cho frontend: report đang được queue và sẽ có sau.
- Ghi audit log sự kiện report queued.
- Notification cho người tạo khi file report đã sẵn sàng.

Với event bus/cache down:

- Không chặn finalize nếu transaction DB chính thành công.
- Ghi cảnh báo vận hành để retry notification/cache invalidation.
- Không dùng cache làm nguồn số liệu chốt.

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
- Tiến độ chốt theo phiên kiểm kê.
- Cảnh báo scope đang bị khóa.
- Cảnh báo report đã cũ sau khi reopen.
- Nút xem lịch sử mở lại và lịch sử file xuất.
- Trạng thái sinh báo cáo: `idle`, `generating`, `completed`, `failed`.
- Danh sách lỗi validate: pending items, overlap warnings, missing signers.

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
- Nếu scope trên 50.000 item, không lock đồng bộ trong request; chuyển sang async job `LARGE_SCOPE_CLOSING`.
- API trả `PROCESSING`, `jobId`, thời gian hoàn tất ước tính và notification khi xong.
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

Ngưỡng đề xuất:

- Dưới 10.000 item: xử lý sync có progress nội bộ.
- 10.000 đến 50.000 item: xử lý batch sync hoặc async tùy cấu hình timeout.
- Trên 50.000 item: bắt buộc async job.

## Cache Strategy

Chỉ cache dữ liệu đọc nhiều, không cache dữ liệu dùng để finalize.

Cache keys đề xuất:

- `closing:record:{closingId}`
- `closing:summary:{inventoryId}`
- `closing:available-scopes:{inventoryId}`
- `closing:progress:{inventoryId}`

Invalidation:

- Khi item/detail thay đổi: clear `summary`, `available-scopes`, `progress`.
- Khi closing finalize: clear `record`, `summary`, `progress`.
- Khi reopen: clear `record`, `summary`, `available-scopes`, `progress`.
- Khi report generated: clear `record` và report list.

## Database Guard

Ưu tiên guard ở service layer. Database trigger chỉ dùng nếu cần khóa cứng ở production.

Trigger optional:

- Chặn update `inventory_details` nếu `locked_at` và `closing_scope_id` đã có.
- Tự đánh dấu `inventory_report_files.is_outdated = true` khi closing chuyển từ `FINAL` sang `REOPENED`.

Lưu ý: nếu dùng Prisma migration, trigger cần được quản lý rõ trong migration SQL và test kỹ trên staging.

## Implementation Priority Matrix

P0 - bắt buộc cho lõi an toàn dữ liệu:

- State machine validation.
- Scope overlap detection.
- Item/detail locking mechanism.
- Audit log cho close/reopen.

P1 - cần cho MVP nghiệp vụ:

- Signer management.
- Basic Excel report generation.
- Force close with reason.
- Reopen workflow.
- Cancel scope trong `DRAFT`.

P2 - hoàn thiện sản phẩm:

- PDF report with signatures.
- Cache strategy.
- Event notifications.
- Batch operations.
- Dashboard/statistics API.

P3 - nâng cao:

- Signature pad integration.
- Mobile responsive polish.
- Advanced analytics dashboard.
- Digital signature bằng USB token/OTP/provider ký số.

## Architecture Decision Records

Các quyết định kiến trúc cần ghi thành ADR khi bắt đầu implementation:

### ADR-001: Lock ở InventoryDetail, không khóa cứng InventoryItem

Lý do: một `InventoryItem` có thể liên quan nhiều session hoặc nhiều dòng chi tiết kiểm kê. Lock toàn item có thể chặn thao tác hợp lệ ở session khác.

### ADR-002: Summary tính từ DB tại thời điểm FINAL

Lý do: biên bản chốt cần số liệu chính xác tuyệt đối. Cache/frontend state không được dùng làm nguồn chính thức.

### ADR-003: Report generation async, không chặn closing

Lý do: scope lớn dễ timeout nếu sinh PDF/Excel đồng bộ. Closing có thể final trước, report được sinh sau và lưu kèm checksum.

### ADR-004: Feature flag trước khi rollback schema

Lý do: khi production phát sinh biên bản thật, rollback schema có thể gây mất hồ sơ. Tắt feature trước, xử lý dữ liệu sau.

## Code Organization đề xuất

Nếu refactor theo feature folder, cấu trúc backend đề xuất:

```text
backend/src/features/inventory/closing/
  closing.controller.ts
  closing.service.ts
  closing.state-machine.ts
  closing.validator.ts
  closing.overlap-detector.ts
  closing.lock-manager.ts
  closing.event-emitter.ts
  closing.audit-logger.ts
  closing.report-generator.ts
  closing.cache-manager.ts
  closing.types.ts
  closing.constants.ts
  closing.service.spec.ts
  closing.e2e.spec.ts
```

Nếu repo giữ style routes/services hiện tại, có thể triển khai tối thiểu:

- `backend/src/routes/inventory-closing.routes.ts`
- `backend/src/services/inventory-closing.service.ts`
- `backend/src/services/inventory-closing-state.service.ts`
- `backend/src/services/inventory-closing-report.service.ts`
- `backend/src/types/inventory-closing.types.ts`

## Phân phase triển khai

### Phase A: Core Closing - 2 tuần

Week 1:

- Migration model closing/scope/signer/report file.
- Error handling framework và error codes.
- State machine validation.
- Basic API create/list/detail closing.
- Summary calculation từ DB.

Week 2:

- Validate scope overlap.
- Validate pending items.
- Lock/unlock dữ liệu theo scope.
- Audit log cho chốt/mở lại.
- Event emit cơ bản: created, finalized, reopened.
- Performance test với dataset lớn.

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
- Cache layer cho progress và available scopes.

Week 6:

- Reopen workflow.
- Request/approve reopen.
- Reopen history.
- Mark report outdated khi reopen.
- Load test và tối ưu query.

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

### Phase E: Monitoring & Stabilization - tùy chọn 1 tuần

- Monitoring dashboard cho closing failures, report generation failures và reopen events.
- Alert rule cho chốt lỗi, report lỗi, discrepancy cao.
- Performance tuning.
- Hoàn thiện tài liệu vận hành.
- Health check endpoint.
- Kiểm thử graceful degradation.

Tổng: 8 tuần cho Phase A-D. Có thể thêm 1 tuần Phase E nếu triển khai production quy mô lớn.

## Regression Test

### Unit tests

- Detect scope overlap chính xác.
- Calculate summary từ DB.
- Validate mandatory signers.
- Prevent closing with pending items.
- Force close bắt buộc có lý do.
- Validate state transition.

### Integration tests

- `POST /closing` tạo record và lock items.
- `POST /closing` bị overlap trả `409`.
- `POST /sign` validate signer role.
- `POST /reopen` unlock đúng scope.
- Report generated lưu checksum và metadata.
- `cancel-scope` chỉ hoạt động khi closing còn `DRAFT`.
- Health check trả đúng trạng thái dependency.

### E2E tests

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

### Performance tests

- Chốt 10.000 item trong thời gian chấp nhận được, mục tiêu dưới 30 giây trên staging.
- 100 request đọc progress đồng thời trong lúc closing đang chạy.
- Sinh report 5.000 item, mục tiêu dưới 10 giây nếu dùng async worker phù hợp.
- Scope trên 50.000 item phải chuyển async job, không timeout request.
- Report service down không làm thất bại finalize nếu dữ liệu đã lock/audit thành công.

## Rollback Strategy

Phase A rollback:

- Disable API routes closing.
- Drop hoặc bỏ dùng bảng closing mới nếu chưa có dữ liệu thật.
- Remove lock columns sau khi backup nếu cần rollback schema.
- Clear cache liên quan.

Phase B rollback:

- Export/lưu lại toàn bộ report đã sinh trước khi rollback.
- Giữ file trong storage nhưng disable truy cập UI nếu cần.
- Revert signing flow, không xóa dữ liệu ký nếu đã phát sinh hồ sơ thật.

Nguyên tắc chung:

- Không xóa biên bản/report đã final trên production nếu chưa có backup và phê duyệt.
- Rollback feature flag trước, rollback schema sau.

## Documentation Requirements

Technical:

- API documentation hoặc Swagger/OpenAPI.
- Database schema diagram.
- State machine diagram.
- Sequence diagram cho finalize, reopen, report generation.

Business:

- User manual cho quy trình chốt kiểm kê.
- Role & permission matrix.
- Report templates guide.
- Troubleshooting guide.

Operations:

- Deployment checklist.
- Monitoring & alerting setup.
- Backup & recovery procedure.
- Performance baseline metrics.

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
