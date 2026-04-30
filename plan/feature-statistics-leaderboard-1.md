---
goal: Slice 11 Task 11.3 Frontend Leaderboard Implementation Plan
version: 1.0
date_created: 2026-04-20
last_updated: 2026-04-20
owner: Frontend Team B
status: 'Planned'
tags: [feature, frontend, statistics, leaderboard, slice-11, task-11.3]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Plan nay xac dinh cach trien khai day du trang leaderboard cho Slice 11 Task 11.3 tai user surface, dong bo voi backend contract dang active va quy trinh tai lieu cua du an.

## 1. Requirements & Constraints

- **REQ-001**: Thay skeleton tai `frontend/app/[locale]/(app)/leaderboard/page.tsx` bang page hoat dong, ho tro tab switch `overall|challenge|quiz|course`.
- **REQ-002**: Hien thi bang xep hang voi cac cot bat buoc: rank, avatar, display_name/username, score, delta.
- **REQ-003**: Hien thi my rank cua user hien tai tu truong `my_rank` trong response.
- **REQ-004**: Ho tro phan trang theo response `page`, `page_size`, `total_count`.
- **REQ-005**: Highlight dong cua user hien tai trong bang ket qua.
- **REQ-006**: Dung canonical endpoint `GET /api/stats/leaderboard/`; alias `/api/leaderboard/` chi duoc giu cho compatibility tests, khong dung lam duong chinh trong UI.
- **REQ-007**: Khong goi Axios truc tiep tu component; moi HTTP call phai qua `frontend/src/services/leaderboard.service.ts`.
- **REQ-008**: Trang leaderboard phai locale-aware theo route `/{locale}/leaderboard` va dung i18n keys trong `frontend/messages/en.json`, `frontend/messages/vi.json`.
- **REQ-009**: Tuong thich voi contract serializer backend (`LeaderboardResponseSerializer`, `LeaderboardEntrySerializer`).
- **REQ-010**: Bo sung MSW handlers phu hop contract moi de validation frontend khong can backend live.
- **SEC-001**: Route leaderboard chi render cho user da auth thong qua `UserAccessGate` cua `(app)` layout; khong phat sinh bypass auth moi.
- **SEC-002**: Khong de lo token/claims trong UI logs khi xu ly loi API.
- **API-001**: Mapping type phai dung backend canonical: `overall`, `challenge`, `quiz`, `course`.
- **API-002**: Parse ket qua tu `results` la nguon du lieu chinh; `entries` chi la compatibility mirror.
- **API-003**: Delta badge dung gia tri `delta >= 0` tu backend, khong tu tinh lai tren frontend.
- **CON-001**: Tuan thu `docs/FE_CONVENTIONS.md` ve service-layer, i18n, route-group `(app)`, va component boundaries.
- **CON-002**: Tuan thu `docs/API.md` muc 3.8 la hop dong active cao nhat cho Slice 11 leaderboard.
- **CON-003**: Khong thay doi backend code trong Task 11.3; pham vi la frontend + mock + tests frontend.
- **CON-004**: Khong mo rong sang Task 11.4 (`/admin/statistics`) hoac Task 11.5 (`/admin/dashboard`).
- **GUD-001**: Uu tien tai su dung shadcn primitives (`tabs`, `table`, `badge`, `avatar`, `skeleton`, `button`) da co trong `frontend/src/components/ui/`.
- **GUD-002**: Tach logic truy van/phan trang/type-switch vao hook de page/component giam coupling.
- **PAT-001**: Su dung pattern dang co cua cac page da hoan tat (vi du `AdminUsersPageClient`) cho loading-empty-error-paginate state handling.
- **PAT-002**: Neu co state domain, tao theo mo hinh store-hydrated selector pattern cua Zustand (tranh monolithic store).
- **CNF-001**: Xung dot tai lieu can ghi nhan: `docs/prd/08-statistics.md` neu type `learning`, nhung API active tai `docs/API.md` + backend service da canonical hoa thanh `course`. Task 11.3 buoc phai theo contract active (`course`).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Chuan hoa contract leaderboard frontend theo backend active, loai bo schema cu khong con tuong thich.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cap nhat `frontend/src/types/leaderboard.types.ts`: dinh nghia `LeaderboardType = 'overall' | 'challenge' | 'quiz' | 'course'`; `LeaderboardUser`, `LeaderboardResultRow`, `LeaderboardResponse` co day du fields `type`, `my_rank`, `total_users`, `total_count`, `page`, `page_size`, `results`, `entries` (optional). |  |  |
| TASK-002 | Cap nhat `frontend/src/services/leaderboard.service.ts`: tao `getLeaderboard(params: { type: LeaderboardType; page?: number; limit?: number; offset?: number; })` goi `GET /api/stats/leaderboard/`; giu ham compatibility `getLeaderboardLegacy` (neu can) danh cho test migration, khong dung trong UI moi. |  |  |
| TASK-003 | Chuan hoa docs in-code: cap nhat `frontend/src/services/README.md` va `frontend/src/types/README.md` de mo ta endpoint canonical moi (`/api/stats/leaderboard/`) va shape `results` payload. |  |  |

### Implementation Phase 2

- GOAL-002: Tao domain hook/store cho leaderboard de quan ly type-switch, pagination, loading, va error mot cach deterministic.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Tao `frontend/src/hooks/useLeaderboard.ts` voi API hook: `loadLeaderboard`, `setBoardType`, `goToPage`, expose state `{boardType, page, pageSize, totalCount, rows, myRank, totalUsers, isLoading, errorKey}`; bien error key theo i18n namespace `leaderboard.errors.*`. |  |  |
| TASK-005 | Tao `frontend/src/stores/leaderboard.store.ts` (neu can store) theo selector pattern: state shape toi thieu va actions bat bien; dam bao reset page ve 1 khi doi boardType. |  |  |
| TASK-006 | Rang buoc dependency: `TASK-005` la optional, neu hook local-state du cho pham vi Task 11.3 thi bo qua store; quyet dinh nay phai duoc ghi ro trong implementation notes de tranh over-engineering. |  |  |

### Implementation Phase 3

- GOAL-003: Trien khai UI leaderboard page day du tren route locale-first user surface.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Sua `frontend/app/[locale]/(app)/leaderboard/page.tsx` thanh server entry co `getTranslations('leaderboard')`, mount client component va truyen `locale`. |  |  |
| TASK-008 | Tao `frontend/src/components/features/leaderboard/LeaderboardPageClient.tsx`: render tabs `overall/challenge/quiz/course`, card my-rank, bang ket qua, pagination controls, loading skeleton, empty state, error state. |  |  |
| TASK-009 | Tao `frontend/src/components/features/leaderboard/LeaderboardRankTable.tsx`: dung `Table` + `Avatar` + `Badge`; hien delta badge (`+N` hoac `0` neutral) va highlight dong user hien tai bang class state ro rang. |  |  |
| TASK-010 | Tao helper `frontend/src/components/features/leaderboard/leaderboard.utils.ts` voi function `resolveDisplayName(user)` va `isCurrentUserRow(row, authUserId)` de logic presentation khong lap lai. |  |  |

### Implementation Phase 4

- GOAL-004: Dong bo mock + i18n + navigation de page leaderboard co the test va truy cap day du trong user flow.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Cap nhat `frontend/src/mocks/data/fixtures.ts`: thay `leaderboardFixture` sang shape moi (`rank`, `user`, `score`, `delta`) va bo field legacy khong dung trong contract active. |  |  |
| TASK-012 | Cap nhat `frontend/src/mocks/handlers/leaderboard.handlers.ts`: su dung canonical route `*/api/stats/leaderboard/`, parse query `type`, `page`, `limit`, `offset`, tra payload dung shape backend (`type`, `my_rank`, `total_users`, `total_count`, `page`, `page_size`, `results`, `entries`). |  |  |
| TASK-013 | Cap nhat `frontend/src/mocks/handlers/index.ts` neu can de dam bao leaderboard handler thu tu dung va khong bi shadowed. |  |  |
| TASK-014 | Bo sung i18n keys trong `frontend/messages/en.json` va `frontend/messages/vi.json` namespace `leaderboard`: `title`, `subtitle`, `tabs.*`, `myRank`, `totalUsers`, `columns.*`, `errors.*`, `states.loading`, `states.empty`, `pagination.*`, `deltaLabel`. |  |  |
| TASK-015 | Khong them entry dieu huong leaderboard trong Task 11.3; giu route direct `/{locale}/leaderboard` va de discoverability cho phase sau neu product can. |  |  |

### Implementation Phase 5

- GOAL-005: Xac thuc ky thuat + hanh vi va cap nhat tracker docs theo quy trinh.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Tao/cap nhat test browser checklist cho Slice 11 tai `frontend/playwright.slice11.checklist.test.ts` voi cases: tab switch, pagination, my-rank hien thi, highlight current user, empty/error state fallback. |  |  |
| TASK-017 | Chay `npm run lint` trong `frontend/`; sua tat ca loi phat sinh do leaderboard changes. |  |  |
| TASK-018 | Chay `npx tsc --noEmit` trong `frontend/`; sua loi types do contract migration. |  |  |
| TASK-019 | Chay `npm run build` trong `frontend/`; xac nhan route `/{locale}/leaderboard` build pass. |  |  |
| TASK-020 | Cap nhat `docs/STATUS.md` dong Task Slice 11 frontend sau khi code hoan tat; neu phat sinh thay doi contract docs thi sync `docs/API.md`/`docs/IMPL_PLAN.md` theo propagation rule. |  |  |

## 3. Alternatives

- **ALT-001**: Tai su dung endpoint alias `/api/leaderboard/` cho UI moi. Khong chon vi alias la compatibility path; contract active canonical la `/api/stats/leaderboard/`.
- **ALT-002**: Khong tao hook rieng, viet fetch truc tiep trong page component. Khong chon vi vi pham FE conventions va kho test state transitions.
- **ALT-003**: Tu tinh `delta` tren frontend tu `score` list. Khong chon vi backend da tinh san va can mot source of truth.
- **ALT-004**: Dung mot bang chung cho ca 11.3 va 11.4 trong cung component. Khong chon vi tang coupling user/admin surfaces va vuot scope task.

## 4. Dependencies

- **DEP-001**: `docs/IMPL_PLAN.md` (Slice 11 Task 11.3 scope).
- **DEP-002**: `docs/STATUS.md` (tracking completion state).
- **DEP-003**: `docs/API.md` section 3.8 (leaderboard contract active).
- **DEP-004**: `docs/FE_CONVENTIONS.md` (service/store/hook conventions).
- **DEP-005**: `docs/FE_PAGE_INVENTORY.md` (route inventory and current skeleton state).
- **DEP-006**: `backend/api/serializers/leaderboard.py` (payload serializer truth).
- **DEP-007**: `backend/api/services/leaderboard_service.py` (type normalization, ranking, pagination behavior).
- **DEP-008**: `backend/api/tests/test_leaderboard_api.py` (regression contract examples).
- **DEP-009**: `frontend/src/lib/axios.ts` (shared auth + error interception).

## 5. Files

- **FILE-001**: `frontend/app/[locale]/(app)/leaderboard/page.tsx` - replace skeleton page entry.
- **FILE-002**: `frontend/src/types/leaderboard.types.ts` - canonical leaderboard DTOs.
- **FILE-003**: `frontend/src/services/leaderboard.service.ts` - canonical stats endpoint client.
- **FILE-004**: `frontend/src/hooks/useLeaderboard.ts` - domain fetch/state orchestration.
- **FILE-005**: `frontend/src/stores/leaderboard.store.ts` - optional domain store if selected.
- **FILE-006**: `frontend/src/components/features/leaderboard/LeaderboardPageClient.tsx` - main leaderboard client UI.
- **FILE-007**: `frontend/src/components/features/leaderboard/LeaderboardRankTable.tsx` - rank table subcomponent.
- **FILE-008**: `frontend/src/components/features/leaderboard/leaderboard.utils.ts` - UI helper functions.
- **FILE-009**: `frontend/src/mocks/data/fixtures.ts` - leaderboard fixture shape alignment.
- **FILE-010**: `frontend/src/mocks/handlers/leaderboard.handlers.ts` - MSW canonical handler.
- **FILE-011**: `frontend/src/mocks/handlers/index.ts` - handler registration verification.
- **FILE-012**: `frontend/messages/en.json` - leaderboard i18n keys (English).
- **FILE-013**: `frontend/messages/vi.json` - leaderboard i18n keys (Vietnamese).
- **FILE-014**: `frontend/src/services/README.md` - endpoint contract note update.
- **FILE-015**: `frontend/src/types/README.md` - type contract note update.
- **FILE-016**: `frontend/playwright.slice11.checklist.test.ts` - new browser checklist coverage.
- **FILE-017**: `docs/STATUS.md` - completion state update after implementation.

## 6. Testing

- **TEST-001**: Unit-level hook test (or component behavior test) cho `useLeaderboard`: default type `overall`, page change, tab change reset page=1.
- **TEST-002**: UI render test: tab switch hien thi dung data theo type (`overall/challenge/quiz/course`).
- **TEST-003**: My-rank card hien thi gia tri dung tu `my_rank`; truong hop `null` hien thi fallback text.
- **TEST-004**: Table row highlight dung cho user hien tai.
- **TEST-005**: Delta badge render dung format va style cho `delta=0` va `delta>0`.
- **TEST-006**: Pagination controls disable/enable dung theo `page`, `page_size`, `total_count`.
- **TEST-007**: Loading state dung `Skeleton`; empty state khi `results=[]`; error state khi API fail.
- **TEST-008**: MSW contract test: `GET /api/stats/leaderboard/` tra payload shape hop le cho tat ca `type` values.
- **TEST-009**: `npm run lint` pass trong `frontend/`.
- **TEST-010**: `npx tsc --noEmit` pass trong `frontend/`.
- **TEST-011**: `npm run build` pass trong `frontend/`.
- **TEST-012**: Playwright checklist pass cho route `/{locale}/leaderboard` voi tab switch + pagination + my-rank + row highlight.

## 7. Risks & Assumptions

- **RISK-001**: Frontend leaderboard schema hien tai dang legacy (`entries` phang) co the gay loi runtime neu migration contract khong dong bo types-service-msw.
- **RISK-002**: Xung dot naming type (`learning` vs `course`) de gay bug silent neu mapping UI sai.
- **RISK-003**: Neu them navigation link leaderboard vao UserLayout co the anh huong snapshot/expectation cua test da ton tai.
- **RISK-004**: Neu dong bo docs khong day du sau implementation, co nguy co lech trang thai giua `IMPL_PLAN.md`, `STATUS.md`, va `FE_PAGE_INVENTORY.md`.
- **ASSUMPTION-001**: Backend leaderboard endpoints va payload contract hien tai da on dinh theo tests `backend/api/tests/test_leaderboard_api.py`.
- **ASSUMPTION-002**: Task 11.3 khong yeu cau backend API moi ngoai endpoint da active.
- **ASSUMPTION-003**: Trang leaderboard nam trong user surface `(app)` va tiep tuc duoc bao ve boi `UserAccessGate`.
- **ASSUMPTION-004**: i18n namespace `leaderboard` co the them moi ma khong pha vo key hierarchy hien co.

## 8. Related Specifications / Further Reading

- AGENT.md
- CLAUDE.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/DECISIONS.md
- docs/API.md
- docs/FE_CONVENTIONS.md
- docs/FE_PAGE_INVENTORY.md
- docs/prd/08-statistics.md
- backend/api/serializers/leaderboard.py
- backend/api/services/leaderboard_service.py
- backend/api/tests/test_leaderboard_api.py
