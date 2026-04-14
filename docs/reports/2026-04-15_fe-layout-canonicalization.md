# Session Report: Frontend Layout Canonicalization & Skeleton Pages

**Date:** 2026-04-15
**Slices / Areas:** Cross-slice — Frontend Architecture (User Surface + Admin Surface)

## Summary

Xác lập kiến trúc layout chuẩn cho toàn bộ user surface: bỏ nav sidebar khỏi `(app)/`, tách biệt rõ ràng giữa `(app)/` (full-width) và `(catalog)/` (filter panel trong page). Tạo skeleton `page.tsx` cho tất cả route đã định nghĩa trong FE_PAGE_INVENTORY.md, xóa `(public)/` route group, cập nhật toàn bộ navigation links và references trong Navbar/sidebar của cả user surface và admin surface.

## Completed Items

- Bỏ nav sidebar khỏi `(app)/layout.tsx` (`showSidebar={false}`)
- Chuyển `(public)/profile/[username]/page.tsx` vào `(app)/profile/[username]/page.tsx` (yêu cầu auth)
- Xóa `(public)/` route group hoàn toàn
- Tạo 21 skeleton `page.tsx` cho tất cả route chưa implement
- Cập nhật `FE_PAGE_INVENTORY.md`: dir map, status legend (`skeleton`), layout group, status của mọi route
- Cập nhật `FE_CONVENTIONS.md`: ghi rõ rule "no nav sidebar", Navbar là primary nav, rule gán route group
- Sửa `AdminLoginForm.tsx` redirect sau login: `/admin/rbac` → `/admin/dashboard`
- Sửa `(admin)/(auth)/layout.tsx` GuestOnlyGate redirectTo: `/admin/rbac` → `/admin/dashboard`
- Thêm i18n keys cho admin section (`dashboard`, `courses`, `challenges`, `notifications`, `statistics`) trong `vi.json` + `en.json`
- Mở rộng `AdminLayout` sidebar: thêm Dashboard, Courses, Challenges, Notifications, Statistics
- Mở rộng `UserLayout` topLinks: thêm Courses và Challenges
- Cập nhật tất cả callers của `UserLayout` (3 files) để pass props mới

## Key Implementations

### Layout Topology

1. `(app)/` — auth gate + `showSidebar=false`. Pages render full-width content (dashboard, profile, notifications, leaderboard).
2. `(catalog)/` — auth gate + `showSidebar=false`. Pages tự render 2 cột bên trong: filter panel trái + content phải. Không inject qua layout (tránh RSC/client boundary violation).
3. `(public)/` — xóa. Profile `[username]` chuyển vào `(app)/` để bắt buộc auth (closed-org platform).
4. Navbar là điều hướng duy nhất trong user surface.

### Admin Sidebar Expansion

1. `AdminLayout` nhận thêm 5 props: `dashboardLabel`, `coursesLabel`, `challengesLabel`, `notificationsLabel`, `statisticsLabel`.
2. Sidebar order: Dashboard → Users → RBAC → Config → Quizzes → Courses → Challenges → Notifications → Statistics.
3. Redirect sau admin login: `/admin/rbac` → `/admin/dashboard` (AdminLoginForm + GuestOnlyGate).

### Skeleton Pages

21 file được tạo với component placeholder đơn giản (`<h1>` + "Coming soon"). Các slice sau chỉ cần replace nội dung, không cần tạo file hay cấu hình route mới.

## Files Changed

| File | Change Summary |
|------|---------------|
| `frontend/app/[locale]/(app)/layout.tsx` | Thêm `showSidebar={false}`, thêm `coursesLabel`, `challengesLabel` props |
| `frontend/app/[locale]/(catalog)/layout.tsx` | Thêm `coursesLabel`, `challengesLabel` props |
| `frontend/app/[locale]/page.tsx` | Thêm `coursesLabel`, `challengesLabel` props |
| `frontend/app/[locale]/(app)/profile/[username]/page.tsx` | Tạo mới (moved từ `(public)/`) |
| `frontend/app/[locale]/(public)/profile/[username]/page.tsx` | Xóa |
| `frontend/app/[locale]/(admin)/admin/(auth)/layout.tsx` | GuestOnlyGate redirectTo → `/admin/dashboard` |
| `frontend/app/[locale]/(admin)/admin/(protected)/layout.tsx` | Pass 5 label props mới cho AdminLayout |
| `frontend/src/components/layouts/UserLayout.tsx` | Thêm `coursesLabel`, `challengesLabel` props + routes vào topLinks/sidebarLinks |
| `frontend/src/components/layouts/AdminLayout.tsx` | Thêm 5 props + links mới vào sidebar và topLinks |
| `frontend/src/components/features/auth/AdminLoginForm.tsx` | Redirect → `/admin/dashboard` |
| `frontend/messages/en.json` | Thêm admin keys: dashboard, courses, challenges, notifications, statistics |
| `frontend/messages/vi.json` | Thêm admin keys: dashboard, courses, challenges, notifications, statistics |
| `docs/FE_PAGE_INVENTORY.md` | Cập nhật dir map, status legend, layout groups, status của mọi row |
| `docs/FE_CONVENTIONS.md` | Thêm 3 rules về no-nav-sidebar, sidebar=filter-only, route group assignment |
| `frontend/app/[locale]/(auth)/forgot-password/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(auth)/reset-password/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(app)/notifications/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(app)/leaderboard/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(catalog)/courses/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(catalog)/courses/[slug]/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(catalog)/courses/[slug]/lessons/[id]/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(catalog)/challenges/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(catalog)/challenges/[slug]/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/dashboard/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/notifications/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/statistics/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/new/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/[slug]/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/learn/lessons/[id]/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/challenges/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/challenges/new/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/challenges/[slug]/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/challenges/[slug]/flags/page.tsx` | Tạo mới — skeleton |
| `frontend/app/[locale]/(admin)/admin/(protected)/challenges/instances/page.tsx` | Tạo mới — skeleton |

## Notes / Caveats

- `UserLayout` vẫn nhận `sidebarLinks` prop (không hiển thị vì `showSidebar=false` mọi nơi). Có thể cleanup sau khi toàn bộ slices ổn định.
- Navbar topLinks admin hiện có 7 links — nếu cần thu gọn khi implement dashboard Slice 11 thì có thể ẩn bớt.
- Skeleton pages `forgot-password` và `reset-password` phụ thuộc Task 1.4B (email backend) — chỉ là placeholder, chưa có form logic.
- Build pass: 62 routes, 0 errors. `tsc --noEmit`: 0 errors.
