 CRITICAL
P01 — Manifest V3 Service Worker bị kill

MV3 Service Worker tự động bị Chrome kill sau ~30s không hoạt động
AI hay viết code lưu state trong biến global của SW → mất sạch khi SW restart
Fix: Toàn bộ state phải lưu vào chrome.storage, không lưu biến

P02 — Content Script chạy trước DOM ready

AI inject script ở document_start nhưng query selector khi DOM chưa có
Fix: Dùng document_idle trong manifest, hoặc check document.readyState

P03 — MutationObserver leak

AI tạo observer nhưng không disconnect → chạy mãi, ăn RAM
Fix: Disconnect khi tab ẩn, reconnect khi tab active lại

P04 — chrome.storage.sync quota

Limit 8KB per item, 100KB total
AI hay dump cả object lớn vào sync
Fix: Chỉ lưu settings nhỏ vào sync, log/history vào chrome.storage.local


🟡 SELECTOR / PLATFORM
P05 — Selector Threads/IG/FB thay đổi liên tục

Các platform dùng class name được hash (x1abc123) → đổi mỗi deploy
AI hay hardcode class → hỏng sau 1-2 tuần
Fix: Dùng attribute selector hoặc structural selector thay vì class

js  // SAI
  div.x1n2onr6.x1ja2u2z
  // ĐÚNG
  article[role="article"], div[data-pressable-container]
P06 — Infinite scroll không trigger observer

Platform dùng virtual DOM / windowing → chỉ render item đang visible
Observer thấy DOM thay đổi nhưng không có post mới thực sự
Fix: Observe document.body với subtree: true, debounce 150ms

P07 — View count format khác nhau theo locale

VN: 1,2K | US: 1.2K | JP: 1.2万
AI parse parseInt("1.2K") → NaN
Fix: Cần normalize function riêng cho từng locale


🟡 PERFORMANCE
P08 — querySelectorAll trên toàn document mỗi mutation

Mỗi lần scroll AI gọi document.querySelectorAll('article') → scan toàn DOM
Fix: Chỉ scan addedNodes từ MutationObserver record

P09 — Debounce thiếu hoặc sai

AI hay viết debounce nhưng không clear timeout đúng cách → vẫn fire nhiều lần
Fix: Pattern chuẩn:

js  let timer
  observer = new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(processNewNodes, 150)
  })

🟡 LOG SYSTEM
P10 — Log panel không scroll đúng

AI render log nhưng không auto-scroll xuống entry mới nhất
Fix: Sau mỗi append: logPanel.scrollTop = logPanel.scrollHeight

P11 — Log quá nhiều làm chậm popup

Infinite scroll → hàng ngàn log entries → popup lag
Fix: Giới hạn 200 entries, xóa oldest khi vượt

P12 — Copy log API khác nhau

document.execCommand('copy') deprecated
Fix: Dùng navigator.clipboard.writeText(), fallback nếu không có permission


🟠 SECURITY / STORE POLICY
P13 — Dùng eval() hoặc inline script

MV3 cấm hoàn toàn, extension bị reject khỏi Chrome Web Store
AI hay dùng innerHTML với script tag
Fix: Không bao giờ dùng eval, new Function(), inline <script>

P14 — host_permissions quá rộng

AI hay để "<all_urls>" cho nhanh → Chrome warning người dùng
Fix: Chỉ khai báo domain cần thiết:

json  "host_permissions": ["*://*.threads.net/*", "*://*.instagram.com/*"]

🟠 CROSS-CONTEXT COMMUNICATION
P15 — Message passing không có error handling

AI gọi chrome.runtime.sendMessage nhưng không handle trường hợp SW đã bị kill
Fix: Luôn wrap trong try/catch + check chrome.runtime.lastError

P16 — Popup và Content Script sync state lệch

User thay đổi setting trong popup nhưng content script đang chạy vẫn dùng setting cũ
Fix: Content script phải lắng nghe chrome.storage.onChanged