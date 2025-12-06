# DevTools Pro ✨

Bộ công cụ developer chuyên nghiệp với 10+ tools: JSON Formatter, XML Formatter, Code Beautifier và nhiều hơn nữa.

## Tính năng

- ⚡ **Cực nhanh**: Auto-format trong thời gian thực
- 🎨 **Giao diện đẹp**: UI hiện đại với dark/light mode
- ✅ **Validate tức thì**: Kiểm tra lỗi ngay lập tức
- 📊 **Thống kê**: Hiển thị số dòng, ký tự, kích thước file
- 💾 **Import/Export**: Upload và download file
- 📋 **Copy nhanh**: Sao chép kết quả với 1 click
- 🔧 **Tùy chỉnh**: Chọn indent 2/4/8 spaces, compact mode
- 🌓 **Dark/Light Mode**: Chuyển đổi giao diện dễ dàng
- 📱 **Responsive**: Hoạt động tốt trên mọi thiết bị
- 🔍 **SEO Optimized**: Mỗi tool có URL riêng, tối ưu cho search engines

## Công cụ có sẵn

1. **JSON Formatter** - Format & validate JSON
2. **JSON Parser** - Parse và trích xuất dữ liệu JSON
3. **XML Formatter** - Format & beautify XML
4. **JavaScript Beautifier** - Format JS code
5. **Go Formatter** - Format Go/Golang code
6. **Java Formatter** - Beautify Java code
7. **React/JSX Formatter** - Format React components
8. **Python Formatter** - Format Python code
9. **Rust Formatter** - Format Rust code
10. **Base64 to Image** - Convert Base64 string to image
11. **UUID Generator** - Generate UUID v1 & v4 (bulk supported)
12. **JWT Tool** - Encode & Decode JWT tokens
13. **Timestamp Converter** - Convert Unix timestamp ↔ Date

## Cài đặt

```bash
npm install
```

## Chạy dự án

```bash
npm run dev
```

Truy cập: http://localhost:3000

## Build production

```bash
npm run build
```

## Công nghệ sử dụng

- **React 18**: Framework UI
- **React Router**: Routing cho từng tool
- **React Helmet Async**: Dynamic SEO meta tags
- **Vite**: Build tool cực nhanh
- **Monaco Editor**: Editor mạnh mẽ (từ VS Code)
- **Lucide React**: Icon đẹp và nhẹ

## SEO Features

✅ Mỗi tool có URL riêng biệt  
✅ Dynamic meta tags cho mỗi trang  
✅ Open Graph & Twitter Cards  
✅ Structured data (JSON-LD)  
✅ Sitemap.xml & robots.txt  
✅ Canonical URLs  
✅ Mobile optimized  

Xem chi tiết: [SEO-GUIDE.md](../SEO-GUIDE.md)

## Deployment

### Netlify
Deploy tự động, file `_redirects` đã được cấu hình.

### Vercel
Deploy với `vercel.json` đã được setup sẵn.

### Trước khi deploy:
1. Cập nhật domain trong `src/components/SEOHead.jsx`
2. Cập nhật URLs trong `public/sitemap.xml`
3. Thêm `og-image.png` (1200x630px) vào `public/`

## Hướng phát triển tiếp

1. ✅ ~~SEO optimization với routing~~
2. Thêm PWA để có thể cài đặt như app
3. Lưu lịch sử các file đã format
4. Chia sẻ qua link
5. So sánh 2 file (diff viewer)
6. Chuyển đổi giữa các format (JSON ↔ YAML ↔ XML)
7. API endpoint để format từ bên ngoài
8. Dark syntax themes (VS Code themes)

---

Made with ❤️ for developers
