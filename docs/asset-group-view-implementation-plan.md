# Asset Group View Implementation Plan

## Current Architecture Summary

- Frontend: React 19 + Vite + TypeScript, Tailwind utility classes, lucide-react icons.
- Routing: React Router. `/assets` renders `AssetList`; asset detail can also be reached via `/assets/:id`.
- State management: local React state and context. Auth state is in `AuthContext`; modal state is in `ModalContext`.
- Data fetching: custom Axios instance in `frontend/src/lib/api.ts`; no React Query/SWR cache layer.
- Component library: local components plus Tailwind classes; no external design system.
- Asset list component: `frontend/src/pages/AssetList.tsx`.
- Asset detail surface: `frontend/src/components/AssetDetailPopup.tsx`, opened by `ModalManager` through `ModalContext`.
- Permission UX: `useAuth().hasPermission()` and `<Can permission="...">`.
- Backend authorization: `authenticateToken`, `loadPermissions`, `requirePermission`, plus `buildDataScopeWhere`.
- Asset API: `GET /assets` with offset pagination, filters, sorting, and `repairTickets` include; `GET /assets/:id`; export and operational endpoints exist.
- Asset data model: `Asset` includes asset/category code levels, user, department, location, city, status, serial, price, dates, audit/event relations, and `updatedAt`. There is no dedicated `version` field yet.

## Existing Capability Check

- Pagination: yes, offset pagination through `page` and `limit`.
- Cursor pagination: not present.
- Virtualization: not present.
- Drawer/detail reuse: yes, `AssetDetailPopup` is reusable, but it is modal-state driven rather than URL-state driven.
- Audit log: present through audit services and asset detail relations.
- Bulk API/job: no generic async bulk job API yet. Some page-level bulk actions call existing endpoints with selected ID arrays.
- Export API: yes, synchronous Excel endpoints exist.
- User preferences API: not found for pinning grouped views.
- Search debounce: present in `AssetList`.
- Permission/data scope: present, but record-level authorization for future query-mode bulk jobs needs backend design.

## Files To Modify In Phase 1

- `frontend/src/pages/AssetList.tsx`
- `frontend/src/components/AssetGroupedView.tsx`
- `frontend/src/constants/assetStatus.tsx`
- `docs/asset-group-view-implementation-plan.md`

## New Components

- `AssetGroupedView`: renders the grouped view shell, group headers, status summary, breadcrumbs, and asset cards.
- Internal card/group subcomponents inside `AssetGroupedView` unless reuse pressure grows.

## API Changes

- Phase 1: no backend API change. Reuse `GET /assets` with current filters.
- Near-term technical debt: current grouped view loads up to a capped result set through `limit`; a dedicated grouped summary endpoint or cursor-backed grouped endpoint should replace this before larger scale.

## Database Changes

- Phase 1: no migration.
- Future recommendation: add an `Asset.version` field if offline sync, optimistic locking, or conflict resolution becomes in-scope.

## Risks

- Rendering thousands of cards without virtualization can become slow. Phase 1 should keep the card view compact and avoid heavy nested controls.
- `GET /assets` is offset-based and not optimized for grouped aggregation.
- Drawer URL-state is not implemented yet; existing modal context cannot survive reload/bookmark.
- Bulk selection is still ID-array based in the current list; query-mode selection requires backend job support.
- Vietnamese text in some existing files contains mojibake; Phase 1 should avoid broad text rewrites unrelated to grouped view.

## Phase 1: Do Now

- Improve the grouped view into a scan-friendly card layout.
- Keep card content limited to:
  - what the asset is,
  - where it is,
  - who holds or manages it,
  - current status.
- Add a single status mapping source for labels, icons, and tones used by the asset list/grouped view.
- Add group header breadcrumbs and status summary counts.
- Keep the kebab/menu trigger visible and tap-friendly.
- Use existing detail drawer/modal when clicking cards.
- Preserve the existing table view behavior.
- Include loading and empty states.
- Keep API/database unchanged.

## Phase 2: Architecture Only For Now

- Selection model with `explicit`, `page`, and `query` modes.
- Sticky bulk toolbar based on selection model.
- Async bulk job API:
  - `POST /assets/bulk-jobs`
  - `GET /assets/bulk-jobs/:jobId`
  - `GET /assets/bulk-jobs/:jobId/results`
- Backend record-level authorization per selected record.
- Partial success result model with exportable report.
- Query snapshot strategy for bulk jobs.
- User preferences API for pin group:
  - `GET /users/me/preferences`
  - `PATCH /users/me/preferences`

## Phase 3: Architecture Only For Now

- URL-state detail drawer:
  - `/assets?view=grouped&asset=123&panel=overview`
  - `/assets?view=grouped&asset=123&panel=timeline`
- Shared activity/timeline model.
- Async export jobs for large exports.
- Offline queue design with `operationId`, `baseVersion`, and conflict states.
- Version-based conflict resolution.

## Product Owner Confirmation Needed

- Exact grouping priority: asset category only, category + department, category + location, or user-selectable grouping.
- Whether "người quản lý" should be `currentUserName`, department owner, or a separate owner field.
- Status wording for `RETIRED`, `PENDING_DISPOSAL`, `DISPOSED`, and any legacy `LIQUIDATED/BROKEN` values.
- Whether warranty data exists in current production data and which field should drive the card hint.
- Scale target beyond the current roughly 8,800 assets based on real asset growth in the last 2-3 years.

## Rollback

- Phase 1 changes are frontend-only. Rollback by reverting the component/constants changes and the `AssetList` import/usage changes.
- No migration rollback is required for Phase 1.
