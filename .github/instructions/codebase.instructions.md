---
description: Global rules — áp dụng cho MỌI project, MỌI tech stack. Load ngay khi bắt đầu bất kỳ task nào.
applyTo: "**"
---

# Global AI Coding Rules

## 1. Trước khi bắt đầu bất kỳ task nào

Thực hiện theo thứ tự:

1. Kiểm tra `CODEBASE.md` ở root — nếu có, đọc toàn bộ trước
2. Kiểm tra `COMMON_PROBLEMS.md` ở root — nếu có, review checklist trước khi code
3. Xác định **đúng file cần sửa**, liệt kê ra trước khi động vào code
4. Nếu task mơ hồ — hỏi lại, không tự suy diễn và code bừa

## 2. Khi tạo file mới

Thêm header vào đầu mỗi file theo ngôn ngữ tương ứng:

### JavaScript / TypeScript

```js
/**
 * @file path/to/file.js
 * @responsibility Mô tả ngắn gọn file này làm gì (1 dòng)
 * @exports { functionA, functionB }
 * @consumes Các module/service file này gọi đến
 * @consumedBy Các file nào import file này
 * @sideEffects none | Mô tả side effect nếu có (DOM, storage, network...)
 * @knownIssues Ghi lại bug đã biết hoặc limitation
 */
```

### Rust

```rust
//! @file path/to/file.rs
//! @responsibility Mô tả ngắn gọn file này làm gì (1 dòng)
//! @exports struct/fn/trait được pub
//! @consumes Các crate/module được use
//! @consumedBy Các module nào dùng file này
//! @sideEffects none | Mô tả side effect nếu có
//! @knownIssues Ghi lại bug đã biết hoặc limitation
```

### Java / Kotlin

```java
/**
 * @file path/to/File.java
 * @responsibility Mô tả ngắn gọn file này làm gì (1 dòng)
 * @exports Class/interface được public
 * @consumes Các dependency được inject hoặc import
 * @consumedBy Các class nào dùng file này
 * @sideEffects none | Mô tả side effect nếu có
 * @knownIssues Ghi lại bug đã biết hoặc limitation
 */
```

### Python

```python
"""
@file path/to/file.py
@responsibility Mô tả ngắn gọn file này làm gì (1 dòng)
@exports function/class được export
@consumes Các module được import
@consumedBy Các module nào import file này
@sideEffects none | Mô tả side effect nếu có
@knownIssues Ghi lại bug đã biết hoặc limitation
"""
```

## 3. Khi sửa file hiện có

- Thêm export mới → cập nhật `@exports` trong header
- Thêm dependency mới → cập nhật `@consumes` trong header
- Phát hiện bug mới chưa fix ngay → ghi vào `@knownIssues`

## 4. Cập nhật CODEBASE.md

Sau mỗi task có tạo hoặc xóa file:

- Thêm/xóa dòng trong bảng **Cấu trúc & Trách nhiệm**
- Nếu luồng dữ liệu thay đổi → cập nhật section **Luồng Dữ Liệu Chính**
- Nhắc user commit `CODEBASE.md` cùng với code thay đổi

Nếu project chưa có `CODEBASE.md` → tạo mới với template:

```markdown
# [Tên Project] — Codebase Map

> Cập nhật file này mỗi khi thêm/xóa/đổi tên file

## Cấu trúc & Trách nhiệm

| File | Trách nhiệm | Phụ thuộc vào |
| ---- | ----------- | ------------- |
| ...  | ...         | ...           |

## Luồng Dữ Liệu Chính

> Mô tả các luồng chính bằng text hoặc ASCII diagram

## Quy tắc KHÔNG được vi phạm

> Liệt kê từ COMMON_PROBLEMS.md nếu có
```

## 5. Báo cáo trước khi code

Với mọi task, trả lời 3 câu này trước khi viết code:

```
📁 File sẽ sửa: [liệt kê file + lý do]
⚠️  Risk: [có thể ảnh hưởng gì ngoài task không]
📋 COMMON_PROBLEMS liên quan: [P01, P05... hoặc "không có"]
```

## 6. Sau khi code xong

- Chỉ show diff / file thay đổi, không paste lại toàn bộ file nếu không cần
- Nhắc user những bước manual cần làm (restart server, chạy migration, reload extension...)
- Nếu có thay đổi cấu trúc → nhắc cập nhật `CODEBASE.md`
