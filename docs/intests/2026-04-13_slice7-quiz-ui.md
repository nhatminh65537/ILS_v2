# UI Test Checklist — Slice 7: Quiz Management

> Môi trường: Frontend chạy với MSW mock data (không cần backend thật).
> Base URL: `http://localhost:4000`
> Locale mặc định test: `/vi` (có thể lặp lại với `/en` để kiểm tra i18n).

---

## Mock Data Reference

> Hiểu rõ fixture trước khi test để biết kết quả đúng là gì.

### Quizzes (5 bản ghi)

| ID | Tiêu đề | Status | Điểm | Số câu | Thời gian |
|----|---------|--------|------|--------|-----------|
| 1 | OWASP Basics Quiz | **published** | 100 | 5 | 900s (15 phút) |
| 2 | Networking Essentials | **published** | 80 | 8 | 1200s (20 phút) |
| 3 | Crypto Warmup | **published** | 60 | 4 | 600s (10 phút) |
| 4 | Forensics Basics | **draft** | 120 | 10 | 1200s |
| 5 | Cloud Security Quiz | **published** | 90 | 6 | 1000s |

### Câu hỏi (3 bản ghi)

| ID | Quiz | Loại | Nội dung | Score |
|----|------|------|----------|-------|
| 1 | Quiz 1 | single_choice | "Which vulnerability belongs to OWASP Top 10?" | 1 |
| 2 | Quiz 1 | multi_choice | "Select secure coding practices." | 2 |
| 3 | Quiz 3 | fill_blank | "Fill in: SHA-256 is a ____ function." | 1 |

**Đáp án đúng:**
- Q1: "Broken Access Control" (option id=11), explanation có
- Q2: "Input validation" (id=21) + "Parameterized queries" (id=22), không có explanation
- Q3: nhập bất kỳ ký tự nào ≠ rỗng đều tính đúng (mock fill_blank)

### Progress (user 1)

| Quiz | Best Score | Số lần thử |
|------|-----------|------------|
| Quiz 1 | 80 | 3 |
| Quiz 2 | 65 | 2 |
| Quiz 3, 4, 5 | chưa có progress | 0 |

### WS Session Mapping

| Quiz ID | Câu hỏi được dùng | Ghi chú |
|---------|-------------------|---------|
| 1 | Q1 + Q2 (2 câu) | max_score = 3 |
| 3 | Q3 (1 câu) | max_score = 1 |
| 2, 4, 5 | Q1 + Q2 (fallback) | max_score = 3 |

---

## PHẦN A — Quiz Catalog (Trang người dùng)

**Route:** `/vi/quizzes`

### A-1 · Tải trang ban đầu

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-1.1 | Mở `http://localhost:4000/vi/quizzes` | Trang load thành công, không có lỗi console 500 |
| A-1.2 | Quan sát lúc đang load | Hiển thị 6 skeleton card (loading state) |
| A-1.3 | Chờ data load xong | Hiển thị đúng **4 quiz card** (chỉ published: ID 1, 2, 3, 5). Quiz 4 (draft) **không xuất hiện** |
| A-1.4 | Kiểm tra mỗi card | Mỗi card hiển thị: tiêu đề, mô tả (nếu có) |
| A-1.5 | Kiểm tra sidebar filter | Có filter panel bên trái với: ô search, select time limit, phần tags |

### A-2 · Bộ lọc tìm kiếm (Search)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-2.1 | Nhập "owasp" vào ô search | Chỉ còn hiển thị "OWASP Basics Quiz" |
| A-2.2 | Nhập "OWASP" (chữ hoa) | Vẫn tìm thấy (search case-insensitive) |
| A-2.3 | Nhập "xyz_không_tồn_tại" | Hiển thị empty state "Không có kết quả" (noResults) thay vì "Chưa có quiz" (noQuizzes) |
| A-2.4 | Xóa hết nội dung search | 4 quiz card xuất hiện trở lại |
| A-2.5 | Nhập "network" | Chỉ còn "Networking Essentials" |

### A-3 · Bộ lọc thời gian (Time Limit)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-3.1 | Chọn "≤ 10 phút" (15 phút filter) | Chỉ hiển thị Quiz 3 (600s = 10 phút ≤ 15×60=900s) và Quiz 1 (900s ≤ 900s) |
| A-3.2 | Chọn "≤ 30 phút" | Hiển thị tất cả 4 quiz (tất cả đều ≤ 1800s) |
| A-3.3 | Chọn "Không giới hạn" (none) | Không có quiz nào khớp (tất cả đều có time_limit_sec) → hiển thị empty state |
| A-3.4 | Chọn "Tất cả" (any) | Trả về 4 quiz published |

> **Lưu ý filter "≤ 15 phút":** Quiz 1 = 900s = đúng 900, filter là `time_limit_sec <= 15*60 = 900` → khớp. Quiz 3 = 600s → khớp. Quiz 2 = 1200s → không khớp.

### A-4 · Kết hợp filter

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-4.1 | Search "quiz" + chọn "≤ 15 phút" | Chỉ hiển thị quiz có "quiz" trong tên VÀ time_limit ≤ 900s → "OWASP Basics Quiz" và "Cloud Security Quiz"... kiểm tra thực tế |
| A-4.2 | Click nút Reset | Tất cả filter về mặc định, 4 quiz hiển thị |

### A-5 · Điều hướng từ card

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-5.1 | Click vào card "OWASP Basics Quiz" | Điều hướng tới `/vi/quizzes/1` |
| A-5.2 | Click vào card "Crypto Warmup" | Điều hướng tới `/vi/quizzes/3` |

---

## PHẦN B — Quiz Detail (Trang chi tiết quiz)

**Route:** `/vi/quizzes/[id]`

### B-1 · Quiz có progress (Quiz 1 — OWASP Basics Quiz)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-1.1 | Mở `/vi/quizzes/1` | Trang load thành công |
| B-1.2 | Quan sát lúc loading | Hiển thị skeleton (4 vùng) |
| B-1.3 | Kiểm tra header | Tiêu đề "OWASP Basics Quiz" + badge "Published" (màu default/primary) |
| B-1.4 | Kiểm tra mô tả | Hiển thị "Quick OWASP check" |
| B-1.5 | Kiểm tra card thông tin | Total questions: **5**, Quiz point: **100**, Time limit: **15 phút** |
| B-1.6 | Kiểm tra card progress | Best score: **80**, Attempt count: **3** |
| B-1.7 | Kiểm tra nút Start | Nút "Bắt đầu luyện tập" (hoặc tương đương) có link tới `/vi/quizzes/1/session` |
| B-1.8 | Click link "← Quay lại danh sách" | Điều hướng về `/vi/quizzes` |

### B-2 · Quiz chưa có progress (Quiz 3 — Crypto Warmup)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-2.1 | Mở `/vi/quizzes/3` | Trang load thành công |
| B-2.2 | Kiểm tra card progress | Hiển thị text "Chưa có lượt thử" / "noProgress" thay vì các con số |
| B-2.3 | Kiểm tra Time limit | Hiển thị **10 phút** (600 / 60 = 10) |

### B-3 · Quiz không tồn tại

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-3.1 | Mở `/vi/quizzes/9999` | Hiển thị error state + link quay lại catalog |

---

## PHẦN C — Quiz Session (WebSocket)

**Route:** `/vi/quizzes/[id]/session`

> Trang này dùng WS mock. Mỗi session là stateful — mở tab mới mỗi lần test.

### C-1 · Khởi động session (Quiz 1)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-1.1 | Mở `/vi/quizzes/1/session` (hoặc click Start từ trang detail) | Hiển thị spinner + text "Đang kết nối..." |
| C-1.2 | Chờ 1–2 giây | Chuyển sang "Đang xác thực..." rồi ngay lập tức load câu hỏi đầu tiên |
| C-1.3 | Kiểm tra progress header | Hiển thị "Câu 1 / 2" (Quiz 1 có 2 câu trong mock) |
| C-1.4 | Kiểm tra timer | Đồng hồ bắt đầu chạy từ `00:00` |
| C-1.5 | Kiểm tra progress bar | Thanh tiến trình gần 0% (câu 1/2) |

### C-2 · Câu hỏi Single Choice (Q1 — Quiz 1, câu 1)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-2.1 | Quan sát câu hỏi | Nội dung: "Which vulnerability belongs to OWASP Top 10?" |
| C-2.2 | Quan sát các đáp án | 2 radio option: "Broken Access Control" và "Buffer Overflow in Kernel" |
| C-2.3 | Không chọn gì, kiểm tra nút Submit | Nút **disabled** (chưa chọn) |
| C-2.4 | Click chọn "Buffer Overflow in Kernel" (đáp án sai) | Radio được chọn, nút Submit enabled |
| C-2.5 | Click Submit | Hiển thị `QuizAnswerResultCard`: ❌ Sai, điểm = 0, explanation = "Broken Access Control is part of OWASP Top 10." |
| C-2.6 | Kiểm tra nút "Câu tiếp theo" | Nút Next/tiếp theo xuất hiện |

### C-3 · Câu hỏi Single Choice — Đáp án đúng

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-3.1 | Mở session mới `/vi/quizzes/1/session` | Load câu 1 |
| C-3.2 | Chọn "Broken Access Control" | Radio selected |
| C-3.3 | Click Submit | Hiển thị ✅ Đúng, điểm = 1, explanation = "Broken Access Control is part of OWASP Top 10." |

### C-4 · Câu hỏi Multi Choice (Q2 — Quiz 1, câu 2)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-4.1 | Sau câu 1, click "Câu tiếp theo" | Load câu 2: "Select secure coding practices." |
| C-4.2 | Kiểm tra loại câu hỏi | Hiển thị **checkbox** (không phải radio) |
| C-4.3 | Quan sát 3 options | "Input validation", "Parameterized queries", "Disable logs in prod" |
| C-4.4 | Không chọn gì | Nút Submit **disabled** |
| C-4.5 | Chọn chỉ "Input validation" | Submit enabled, nhưng kết quả sẽ sai (thiếu 1 đáp án đúng) |
| C-4.6 | Submit với 1 đáp án | Kết quả ❌ Sai (multi_choice yêu cầu chọn đúng TẤT CẢ correct options) |
| C-4.7 | (Session mới) Chọn "Input validation" + "Parameterized queries" | Submit → ✅ Đúng, điểm = 2 |
| C-4.8 | (Session mới) Chọn cả 3 options | Submit → ❌ Sai (chọn dư 1 sai) |

### C-5 · Câu hỏi Fill Blank (Q3 — Quiz 3)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-5.1 | Mở `/vi/quizzes/3/session` | Load câu "Fill in: SHA-256 is a ____ function." |
| C-5.2 | Kiểm tra UI | Hiển thị **text input** (không phải radio hay checkbox) |
| C-5.3 | Để trống input | Nút Submit **disabled** |
| C-5.4 | Nhập bất kỳ text nào (ví dụ "hash") | Submit enabled |
| C-5.5 | Submit | ✅ Đúng, điểm = 1 (mock fill_blank chấp nhận bất kỳ input nào ≠ rỗng) |
| C-5.6 | Kiểm tra explanation | "SHA-256 is a cryptographic hash function." |

### C-6 · Hoàn thành session và màn hình kết quả (Finish)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-6.1 | Hoàn thành tất cả câu hỏi (Quiz 1: 2 câu) | Sau "Next" ở câu cuối → `QuizFinishScreen` xuất hiện |
| C-6.2 | Kiểm tra điểm (nếu trả lời đúng cả 2) | total_score = **3**, max_score = **3** |
| C-6.3 | Kiểm tra điểm (nếu trả lời sai cả 2) | total_score = **0**, max_score = **3** |
| C-6.4 | Kiểm tra phần trăm | Hiển thị % = total/max × 100 |
| C-6.5 | Kiểm tra thời gian | Hiển thị duration (số giây đã làm) |
| C-6.6 | Click "Quay lại" | Điều hướng về `/vi/quizzes/1` |
| C-6.7 | Click "Thử lại" (TryAgain) | Điều hướng về `/vi/quizzes/1/session` (bắt đầu session mới) |

### C-7 · Quiz không có câu hỏi (fallback WS)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-7.1 | Mở `/vi/quizzes/2/session` | WS fallback dùng Q1+Q2 (quiz 2 không có câu hỏi riêng trong fixture) → session chạy bình thường với 2 câu |

### C-8 · Trạng thái lỗi WS

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-8.1 | Mở session khi MSW không active (tắt MSW thử nghiệm) | Hiển thị Alert error với text "Không thể kết nối..." + nút "Quay lại" |

---

## PHẦN D — Admin: Danh sách Quiz

**Route:** `/vi/admin/quizzes`

> Đây là admin surface — cần đăng nhập admin (mock đã bypass auth trong dev).

### D-1 · Tải trang danh sách

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-1.1 | Mở `/vi/admin/quizzes` | Trang load thành công |
| D-1.2 | Quan sát lúc loading | 6 skeleton row trong table |
| D-1.3 | Chờ data load xong | Table hiển thị **5 quiz** (cả draft, published) |
| D-1.4 | Kiểm tra cột table | Title, Status (badge), Total Questions, Quiz Point, Time Limit, Updated At, Actions |
| D-1.5 | Kiểm tra Quiz 4 (Forensics Basics) | Status badge = "Draft" |
| D-1.6 | Kiểm tra hàng "OWASP Basics Quiz" | Cột Time Limit = 900, Total Questions = 5 (hoặc 2 nếu fixture đã cập nhật) |
| D-1.7 | Kiểm tra nút Create | Nút "Tạo quiz" / "Create" ở góc trên phải của card |

### D-2 · Tìm kiếm trong admin list

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-2.1 | Nhập "crypto" vào search input | Chỉ hiển thị "Crypto Warmup" |
| D-2.2 | Xóa search | Hiển thị lại 5 quiz |
| D-2.3 | Nhập "forensics" | Hiển thị "Forensics Basics" (draft) |
| D-2.4 | Search không phân biệt hoa thường | Nhập "NETWORK" → vẫn ra "Networking Essentials" |

### D-3 · Filter theo Status

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-3.1 | Chọn "Draft" trong dropdown status | Chỉ hiển thị "Forensics Basics" (id=4) |
| D-3.2 | Chọn "Published" | Hiển thị 4 quiz published |
| D-3.3 | Chọn "Archived" | Empty state (chưa có quiz archived) |
| D-3.4 | Chọn "All" | Hiển thị 5 quiz |
| D-3.5 | Click nút Refresh | Tải lại list theo filter hiện tại |

### D-4 · Actions trên từng hàng

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-4.1 | Click nút "Sửa" của Quiz 1 | Điều hướng tới `/vi/admin/quizzes/1` |
| D-4.2 | Click nút "Quản lý câu hỏi" của Quiz 1 | Điều hướng tới `/vi/admin/quizzes/1/questions` |
| D-4.3 | Click nút "Xóa" của Quiz 5 | Hiện `window.confirm` với tiêu đề quiz |
| D-4.4 | Click Cancel trong confirm | Quiz không bị xóa, list không thay đổi |
| D-4.5 | Click OK trong confirm | Quiz 5 bị xóa khỏi list (mock xóa khỏi fixture) |
| D-4.6 | Sau khi xóa Quiz 5 | List còn 4 hàng, "Cloud Security Quiz" không còn |

### D-5 · Xóa quiz và kiểm tra pagination counter

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-5.1 | Kiểm tra counter "Total" | Hiển thị số lượng tổng (5) |
| D-5.2 | Sau khi xóa 1 quiz | Counter cập nhật (4) |
| D-5.3 | Kiểm tra nút Previous/Next | Nếu total ≤ page_size thì Previous/Next bị disabled |

---

## PHẦN E — Admin: Tạo Quiz Mới

**Route:** `/vi/admin/quizzes/new`

### E-1 · Hiển thị form tạo

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| E-1.1 | Click nút "Tạo quiz" từ list, hoặc mở trực tiếp `/vi/admin/quizzes/new` | Trang load với form trống |
| E-1.2 | Kiểm tra giá trị mặc định | Title: rỗng, Description: rỗng, Status: **Draft**, Quiz Point: **10**, Time Limit: **0** |
| E-1.3 | Kiểm tra hint text | Có gợi ý nhỏ dưới Time Limit field |
| E-1.4 | Kiểm tra hint dashed box | Có inline hint về category/tag |

### E-2 · Validation

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| E-2.1 | Để title trống, click Submit | Nút Submit **disabled** (không thể submit) |
| E-2.2 | Nhập title chỉ có spaces ("   ") | Nút Submit disabled (isValid check trim) |

### E-3 · Tạo quiz thành công

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| E-3.1 | Điền Title: "Test Quiz Mới", giữ nguyên các field khác | Submit enabled |
| E-3.2 | Click Submit | POST `/api/quiz/quizzes/` — mock tạo quiz với id=6 (length+1) |
| E-3.3 | Sau khi submit | Điều hướng tới `/vi/admin/quizzes/6` (trang edit quiz mới) |
| E-3.4 | Mở lại `/vi/admin/quizzes` | Danh sách có thêm "Test Quiz Mới" với status Draft |

### E-4 · Tạo quiz với đầy đủ fields

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| E-4.1 | Điền Title: "Full Test Quiz" | — |
| E-4.2 | Điền Description: "Mô tả chi tiết" | — |
| E-4.3 | Đổi Status thành "Published" | — |
| E-4.4 | Đổi Quiz Point thành 200 | — |
| E-4.5 | Đổi Time Limit thành 300 | — |
| E-4.6 | Click Submit | Quiz được tạo với đúng các giá trị trên |
| E-4.7 | Verify trên trang edit | Form hiển thị lại đúng các giá trị vừa nhập |

---

## PHẦN F — Admin: Sửa Metadata Quiz

**Route:** `/vi/admin/quizzes/[id]`

### F-1 · Load form edit

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| F-1.1 | Mở `/vi/admin/quizzes/1` | Trang load form với data của "OWASP Basics Quiz" |
| F-1.2 | Kiểm tra form pre-fill | Title: "OWASP Basics Quiz", Description: "Quick OWASP check", Status: Published, Quiz Point: 100, Time Limit: 900 |
| F-1.3 | Kiểm tra breadcrumb / navigation links | Có link "← Danh sách" và link "Quản lý câu hỏi" |

### F-2 · Cập nhật metadata

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| F-2.1 | Đổi Title thành "OWASP Basics Quiz v2" | Field cập nhật |
| F-2.2 | Đổi Status thành "Draft" | Select hiển thị "Draft" |
| F-2.3 | Đổi Quiz Point thành 150 | Number field cập nhật |
| F-2.4 | Click Save | PATCH `/api/quiz/quizzes/1/` — mock cập nhật fixture |
| F-2.5 | Sau khi save thành công | Hiển thị success message / không có lỗi |
| F-2.6 | Mở lại `/vi/admin/quizzes/1` | Form hiển thị data mới (Title = "OWASP Basics Quiz v2") |

### F-3 · Validation khi edit

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| F-3.1 | Xóa hết nội dung Title | Submit button **disabled** |
| F-3.2 | Nhập lại title hợp lệ | Submit button enabled trở lại |

### F-4 · Điều hướng từ trang edit

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| F-4.1 | Click link "Quản lý câu hỏi" | Điều hướng tới `/vi/admin/quizzes/1/questions` |
| F-4.2 | Click link "← Danh sách" | Điều hướng về `/vi/admin/quizzes` |

---

## PHẦN G — Admin: Quản lý Câu Hỏi

**Route:** `/vi/admin/quizzes/[id]/questions`

### G-1 · Load danh sách câu hỏi

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-1.1 | Mở `/vi/admin/quizzes/1/questions` | Trang load thành công |
| G-1.2 | Kiểm tra subtitle | Hiển thị tên quiz "OWASP Basics Quiz" |
| G-1.3 | Quan sát lúc loading | 4 skeleton row |
| G-1.4 | Chờ load xong | **2 câu hỏi** trong table (Q1 pos=1 và Q2 pos=2 thuộc quiz 1) |
| G-1.5 | Kiểm tra cột table | Position, Type (badge), Score, Content (truncated), Actions |
| G-1.6 | Kiểm tra Q1 | Position=1, Type="Single Choice", Score=1, Content="Which vulnerability..." |
| G-1.7 | Kiểm tra Q2 | Position=2, Type="Multi Choice", Score=2, Content="Select secure coding..." |
| G-1.8 | Kiểm tra nút "Thêm câu hỏi" | Nút ở góc trên phải của card |
| G-1.9 | Kiểm tra breadcrumb | Có link "← Danh sách" và "← Metadata quiz" |

### G-2 · Quiz không có câu hỏi (Quiz 2)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-2.1 | Mở `/vi/admin/quizzes/2/questions` | Table hiển thị **empty state** "Chưa có câu hỏi" |

### G-3 · Tạo câu hỏi Single Choice

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-3.1 | Click "Thêm câu hỏi" | Dialog mở với mode="create" |
| G-3.2 | Kiểm tra giá trị mặc định dialog | Type: "Single Choice", Score: 1, Position: 3 (sau 2 câu hiện có), 2 option trống |
| G-3.3 | Để trống content, click Save | Hiển thị validation error |
| G-3.4 | Điền content "Câu hỏi test", score=0 | Score=0 → validation error (score phải > 0) |
| G-3.5 | Điền đầy đủ: content "Câu hỏi test SC", score=1, 2 options, đánh dấu 1 đúng | Hợp lệ |
| G-3.6 | Single choice: đánh dấu 2 option là đúng | Validation error: "Phải có đúng 1 đáp án đúng" |
| G-3.7 | Single choice: không đánh dấu option nào đúng | Validation error tương tự |
| G-3.8 | Single choice: để trống nội dung option | Validation error: "Option không được trống" |
| G-3.9 | Điền đúng, click Save | Dialog đóng, câu hỏi mới xuất hiện trong table ở cuối |
| G-3.10 | Kiểm tra total_questions của quiz | Tăng lên 3 (sau khi thêm 1 câu) — kiểm tra trên `/vi/admin/quizzes/1` |

### G-4 · Tạo câu hỏi Multi Choice

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-4.1 | Click "Thêm câu hỏi", chọn type "Multi Choice" | Dialog hiển thị options với checkbox (không phải radio) |
| G-4.2 | Không đánh dấu option nào đúng | Validation error: "Cần ít nhất 1 đáp án đúng" |
| G-4.3 | Đánh dấu nhiều option đúng | Hợp lệ (multi_choice cho phép nhiều correct) |
| G-4.4 | Single choice behavior check | Khi type=SingleChoice, chọn option B đúng → option A tự bỏ chọn (radio behavior) |
| G-4.5 | Điền đầy đủ, click Save | Câu hỏi tạo thành công |

### G-5 · Tạo câu hỏi Fill Blank

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-5.1 | Click "Thêm câu hỏi", chọn type "Fill Blank" | Dialog đổi sang hiển thị "Đáp án" thay vì "Options" |
| G-5.2 | Kiểm tra UI | Không có checkbox is_correct; có ô nhập answer text |
| G-5.3 | Để trống tất cả answer | Validation error: "Cần ít nhất 1 đáp án" |
| G-5.4 | Có thể thêm nhiều answer (click "Thêm đáp án") | Thêm được answer mới |
| G-5.5 | Xóa answer khi chỉ còn 1 | Nút xóa **disabled** (answers.length <= 1) |
| G-5.6 | Điền 1 answer hợp lệ, click Save | Câu hỏi tạo thành công |

### G-6 · Chuyển đổi loại câu hỏi trong dialog

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-6.1 | Mở dialog, chọn "Single Choice" → đổi sang "Fill Blank" | UI chuyển từ options panel sang answers panel |
| G-6.2 | Đổi lại "Multi Choice" | UI quay về options panel |
| G-6.3 | Đổi sang "Fill Blank" rồi đổi về "Single Choice" | State options vẫn còn (không reset khi đổi loại) |

### G-7 · Sửa câu hỏi

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-7.1 | Click "Sửa" trên Q1 | Dialog mở với mode="edit", pre-fill đúng data Q1 |
| G-7.2 | Kiểm tra pre-fill Q1 | Content: "Which vulnerability belongs to OWASP Top 10?", Type: Single Choice, Score: 1, Position: 1 |
| G-7.3 | Kiểm tra options Q1 | 2 options: "Broken Access Control" (đánh dấu đúng), "Buffer Overflow..." |
| G-7.4 | Sửa content thành "Câu hỏi đã sửa", click Save | Câu hỏi cập nhật trong table |
| G-7.5 | Kiểm tra nội dung sau khi sửa | Cột Content trong table hiển thị "Câu hỏi đã sửa" |

### G-8 · Xóa câu hỏi

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-8.1 | Click "Xóa" trên Q2 | Hiện `window.confirm` |
| G-8.2 | Click Cancel | Câu hỏi không bị xóa |
| G-8.3 | Click "Xóa" lần nữa, xác nhận OK | Q2 bị xóa, chỉ còn Q1 trong table |
| G-8.4 | Kiểm tra position sau khi xóa | Q1 vẫn position=1, không bị reorder (chỉ còn 1 câu) |
| G-8.5 | Kiểm tra total_questions của quiz | Giảm xuống (kiểm tra `/vi/admin/quizzes/1`) |

### G-9 · Reorder câu hỏi (Move Up / Move Down)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-9.1 | Kiểm tra nút "Lên" của Q1 (đầu tiên) | Nút **disabled** (đã ở đầu) |
| G-9.2 | Kiểm tra nút "Xuống" của Q2 (cuối cùng) | Nút **disabled** (đã ở cuối) |
| G-9.3 | Kiểm tra nút "Lên" của Q2 | Nút **enabled** |
| G-9.4 | Click "Lên" trên Q2 | Q2 và Q1 hoán đổi vị trí trong table |
| G-9.5 | Kiểm tra position sau reorder | Q2 hiển thị position=1, Q1 position=2 |
| G-9.6 | Click "Xuống" trên Q2 (giờ đang ở đầu) | Đổi lại về vị trí ban đầu |

### G-10 · Preview câu hỏi

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-10.1 | Click "Xem trước" trên Q1 | `AdminQuizQuestionPreviewCard` xuất hiện bên dưới table |
| G-10.2 | Kiểm tra preview | Hiển thị câu hỏi như member sẽ thấy (không có is_correct info) |
| G-10.3 | Click "Xem trước" lần nữa trên Q1 | Preview card **đóng** (toggle) |
| G-10.4 | Click "Xem trước" trên Q2 | Preview card mới của Q2 xuất hiện, Q1 preview đóng |

### G-11 · Xóa option trong dialog (edge case)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| G-11.1 | Mở dialog tạo, quan sát 2 option mặc định | Nút "Xóa" trên mỗi option |
| G-11.2 | Thử click "Xóa" option khi chỉ có 2 | Nút **disabled** (options.length <= 2) |
| G-11.3 | Click "Thêm option" → thêm option 3 | 3 options, nút xóa enabled |
| G-11.4 | Xóa option 3 | Còn 2 options, nút xóa disabled lại |

---

## PHẦN H — Kiểm tra Cross-feature

### H-1 · Tạo quiz → thêm câu hỏi → xem trong catalog

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| H-1.1 | Tạo quiz mới với status Published tại `/vi/admin/quizzes/new` | Quiz id=6 được tạo |
| H-1.2 | Vào `/vi/admin/quizzes/6/questions`, thêm 1 câu hỏi | total_questions tăng từ 0 lên 1 |
| H-1.3 | Mở `/vi/quizzes` | Quiz mới (published) xuất hiện trong catalog |
| H-1.4 | Click vào quiz mới | Detail page hiển thị total_questions=1 |

### H-2 · Xóa quiz → kiểm tra catalog

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| H-2.1 | Xóa "Crypto Warmup" (id=3) từ admin list | Quiz bị xóa khỏi fixture |
| H-2.2 | Mở `/vi/quizzes` | "Crypto Warmup" **không còn** trong catalog |
| H-2.3 | Truy cập trực tiếp `/vi/quizzes/3` | Hiển thị error state |

### H-3 · Đổi status Draft → Published

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| H-3.1 | Sửa Quiz 4 (Forensics Basics, Draft) → đổi status thành Published | Save thành công |
| H-3.2 | Mở `/vi/quizzes` | "Forensics Basics" **xuất hiện** trong catalog (nay là published) |

---

## PHẦN I — Kiểm tra i18n (Tiếng Anh)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| I-1 | Mở `http://localhost:4000/en/quizzes` | Trang hiển thị bằng tiếng Anh, không có key chưa dịch |
| I-2 | Mở `/en/admin/quizzes` | Admin UI bằng tiếng Anh |
| I-3 | Kiểm tra badge status | "Published", "Draft", "Archived" (không phải key i18n thô) |
| I-4 | Kiểm tra session `/en/quizzes/1/session` | Text "Connecting...", "Authenticating...", "Question 1 of 2" bằng tiếng Anh |
| I-5 | Kiểm tra finish screen | "Back", "Try Again" bằng tiếng Anh |

---

## PHẦN J — Kiểm tra UI/UX Chung

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| J-1 | Kiểm tra admin sidebar | Có mục "Quizzes" dưới phần Content Management |
| J-2 | Kiểm tra user sidebar | Có mục "Quizzes" dưới phần Catalog/Học tập |
| J-3 | Resize browser xuống mobile (≤768px) | Filter panel catalog ẩn đi (`hidden md:block`) |
| J-4 | Kiểm tra disabled state khi đang mutate | Nút Delete disabled khi `isMutating=true` |
| J-5 | Kiểm tra dialog overflow | Mở dialog tạo câu hỏi, thêm nhiều options → dialog có scroll (`overflow-y-auto`) |
| J-6 | Kiểm tra tab navigation | Có thể navigate qua các field trong form bằng Tab key |

---

## Checklist Tổng Kết

### Trạng thái kiểm tra

> Điền vào cột "Kết quả" sau mỗi lần test: ✅ Pass / ❌ Fail / ⚠️ Partial / 🔲 Chưa test

| Nhóm | Mô tả | Kết quả | Ghi chú |
|------|-------|---------|---------|
| A | Quiz Catalog (load, filter, navigate) | 🔲 | |
| B | Quiz Detail (progress, no-progress, 404) | 🔲 | |
| C | Quiz Session WebSocket (3 loại câu hỏi, finish) | 🔲 | |
| D | Admin Quiz List (table, filter, delete) | 🔲 | |
| E | Admin Create Quiz (validation, submit) | 🔲 | |
| F | Admin Edit Quiz (pre-fill, update) | 🔲 | |
| G | Admin Questions (CRUD, reorder, preview) | 🔲 | |
| H | Cross-feature flows | 🔲 | |
| I | i18n (EN locale) | 🔲 | |
| J | UI/UX chung | 🔲 | |

---

## Ghi chú cho Tester

1. **MSW state là mutable trong session**: Sau khi xóa/tạo item, reload trang sẽ reset về fixture ban đầu (MSW state không persist qua page reload hard). Các test trong một flow nên thực hiện liên tục mà không reload.

2. **WS session**: Mỗi lần mở `/session` là một WS connection mới. Đóng tab và mở lại để test lại.

3. **Fill blank mock**: MSW chấp nhận **bất kỳ text nào ≠ rỗng** là đúng cho fill_blank. Đây là giới hạn của mock — không cần test case sensitive hay exact match.

4. **Quiz 1 trong WS**: Chỉ có 2 câu hỏi thực tế (Q1+Q2), mặc dù fixture có `total_questions: 5`. Đây là mock data gap bình thường.

5. **window.confirm**: Test trên browser thật — headless/automated test cần mock `window.confirm`.
