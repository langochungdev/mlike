# Plan: Browser Extension - Content Filter by View Count

## Stack Tech

**Manifest V3** (chuẩn hiện đại, bắt buộc từ Chrome 2024+)

| Layer | Tech | Lý do |
|---|---|---|
| UI Popup | Vanilla JS + CSS Variables | Zero dependency, fast, dễ AI debug |
| Content Script | Vanilla JS | Chạy trực tiếp trên page, no overhead |
| Background | Service Worker (MV3) | Chuẩn MV3, lightweight |
| Storage | `chrome.storage.sync` | Sync across devices |
| Build | None (no bundler) | AI dễ đọc, dễ sửa, dễ debug |

> **Không dùng React/Vue** — Extension nhỏ, thêm framework = thêm complexity cho AI debug, build step phức tạp không cần thiết.

---

## Cơ chế che nội dung — An toàn & Mượt

### Tại sao KHÔNG dùng `display:none` hay xóa DOM?
- Các platform detect mutation → có thể flag tài khoản
- Layout shift gây lag, re-render nặng

### ✅ Dùng CSS Override (Blur + Collapse)

**Chế độ 1 — Blur/Cover** (an toàn nhất):
```css
.ext-filtered {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
  position: relative;
}
```
Platform không thể phân biệt với user CSS thông thường.

**Chế độ 2 — Hide** (ẩn hoàn toàn):
```css
.ext-filtered-hide {
  height: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}
```
Không xóa DOM node → platform không detect được.

**MutationObserver** để xử lý infinite scroll / lazy load — debounce 150ms để không lag.

---

## Cơ trúc File

```
extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   ├── index.js          ← main logic
│   ├── observer.js       ← MutationObserver + debounce
│   ├── platforms/
│   │   ├── thread.js     ← selector cho Threads
│   │   ├── instagram.js  ← selector cho IG
│   │   └── facebook.js   ← selector cho FB
│   └── logger.js         ← hệ thống log
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── icons/
```

---

## Hệ thống Log — Copy cho AI Debug

```js
// logger.js
const LOG_LEVELS = { INFO, WARN, ERROR, BLOCK, SKIP }

// Mỗi log entry:
{
  time: "14:23:01.123",
  level: "BLOCK",
  platform: "threads",
  msg: "Blocked post - views: 1.2K < threshold: 5K",
  selector: "div[data-pressable-container]",
  element: "<div class='x...'>"  // truncated
}
```

**Popup có:**
- Live log panel cuộn được
- Nút **Copy All** → clipboard
- Nút **Clear** → xóa sạch để debug fresh
- Filter theo level (ALL / BLOCK / ERROR)
- Counter: bao nhiêu bài đã bị filter trong session

---

## UI Popup — Triết lý Steve Jobs

> *"Simplicity is the ultimate sophistication"*

**Layout:** 1 màn hình, không có tab, không có menu ẩn

```
┌─────────────────────────────┐
│  👁 LikeFilter              │  ← tên + icon đơn giản
├─────────────────────────────┤
│  Minimum views              │
│  ┌─────────────┐            │
│  │    5,000    │  [─────●──]│  ← slider + input sync
│  └─────────────┘            │
│                             │
│  Filter mode                │
│  ● Blur    ○ Hide           │  ← 2 lựa chọn rõ ràng
│                             │
│  Platform                   │
│  [✓] Threads  [✓] IG  [ ] FB│
├─────────────────────────────┤
│  Blocked: 12 posts today    │  ← stat đơn giản
├─────────────────────────────┤
│  [─── LOG ───────── ▼ ───] │  ← collapsible
│  14:23 BLOCK views:1.2K     │
│  14:24 SKIP  views:8K       │
│  [Copy]            [Clear]  │
└─────────────────────────────┘
```

**Design tokens:**
- Font: System font stack (`-apple-system, SF Pro`)
- Color: 2 màu — Background `#0a0a0a`, Accent `#6366f1`
- Width: 320px cố định
- Không có shadow rườm rà, không animation thừa

---

## Roadmap mở rộng

| Phase | Feature |
|---|---|
| v1 | Threads — filter by view count |
| v2 | Instagram feed + Reels |
| v3 | Facebook |
| v4 | Chặn quảng cáo (dùng cùng cơ chế Hide) |
| v5 | Export/import settings |

---

## Điểm quan trọng cho AI khi code

1. **Mỗi platform = 1 file riêng** → AI chỉ cần đọc 1 file khi debug selector
2. **Logger inject vào mọi action** → AI nhìn log là biết ngay vấn đề ở đâu
3. **No build step** → AI sửa file là load extension là test ngay
4. **Comment rõ từng selector** tại sao chọn attribute đó → khi platform update, AI biết cần tìm gì thay thế