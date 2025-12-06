# DevTools Pro - AI Agent Instructions

## Project Overview
Multi-tool developer utility built with React + Vite featuring 13+ tools: JSON/XML formatters, code beautifiers (JavaScript, Go, Java, React, Python, Rust), Base64-to-image converter, UUID generator, JWT encoder/decoder, and timestamp converter. Single-page app with routing and SEO optimization.

## Architecture
- **Single component design**: All tools live in `fe/src/App.jsx` (~1250 lines) with tool-specific logic in separate callback handlers
- **React Router**: Each tool has its own URL for SEO (e.g., `/json-formatter`, `/uuid-generator`, `/jwt-tool`)
- **Tool switching**: `activeTool` state synced with URL, drives which formatter/tool runs via conditional logic in `useEffect` (lines 90-145)
- **Monaco Editor**: Primary UI for code input/output panels, configured per-tool with language-specific syntax highlighting
- **Dynamic SEO**: React Helmet Async provides unique meta tags for each route

## Key Patterns

### Tool Implementation Pattern
Each formatter follows this structure in `App.jsx`:
```javascript
const formatXXX = useCallback((text) => {
  if (!text.trim()) { /* clear state */ }
  try {
    // Format logic here
    setOutput(formatted)
    setError('')
    updateStats(result) // or inline stats calculation
  } catch (err) {
    setError(err.message)
    setOutput('')
  }
}, [dependencies])
```

Example locations: `formatJSON` (line 35), `formatXML` (line 357), `formatGo` (line 463)

### Adding New Tools
1. Add nav button in `<nav className="nav-menu">` (line ~860)
2. Create `formatXXX` or `handleXXX` callback following the pattern above
3. Add case to auto-format `useEffect` switch (line 90-145)
4. Add sample data to `loadSample()` switch (line 240-330)
5. Update panel headers (lines ~1030, ~1160) and Monaco language config (lines ~1115)
6. Add SEO config to `src/config/seoConfig.js`
7. Add route to `src/main.jsx` and update `public/sitemap.xml`

### Tool-Specific Patterns
**UUID Generator** (lines 680-698):
- Uses special UI with dropdowns instead of Monaco Editor
- Input format: "version|count" (e.g., "v4|5")
- Generates UUIDs using `uuid` package (v1, v4)
- No file upload/download needed

**JWT Tool** (lines 700-747):
- Decodes JWT tokens using `jwt-decode` package
- Splits token into header, payload, signature
- Shows decoded JSON with proper formatting
- Use `atob()` for Base64 decoding header

**Timestamp Converter** (lines 749-823):
- Auto-detects if input is Unix timestamp or date string
- Handles both seconds (10 digits) and milliseconds (13 digits)
- Provides "Get Current Timestamp" button
- Outputs multiple formats: ISO, UTC, local time, components

### State Management
- `activeTool`: Current formatter ('json-formatter', 'xml-formatter', etc.)
- `input/output`: Editor contents
- `error`: Validation error message (cleared on success)
- `stats`: Auto-calculated on format success: `{ chars, lines, size }`
- `indentSize/isCompact`: Format options affecting all code formatters

## Development Workflow

### Running the App
```bash
cd fe
npm install
npm run dev  # Opens http://localhost:3000 automatically
```

### Building
```bash
npm run build   # Production build to fe/dist
npm run preview # Preview production build
```

### Styling
CSS custom properties in `App.css` control theming:
- Light/dark mode toggled via `.app.light` class
- Uses Inter font (loaded via Google Fonts in `index.html`)
- CSS variables pattern: `var(--bg-main)`, `var(--text-primary)`, etc.

## Project-Specific Conventions

### Formatter Logic
- **Basic formatters** (JS, Go, Java, Rust, React): Regex-based line-by-line indentation, not AST parsing
- **XML**: Uses DOMParser validation + custom `formatXMLString` helper (line 388)
- **JSON**: Native `JSON.parse/stringify` with error handling
- **Go**: Uses tabs (`\t`) for indentation; others use spaces based on `indentSize`

### File Operations
- Upload: FileReader reads to `input` state (line 184)
- Download: Creates Blob with tool-specific MIME type (lines 126-180)
- Base64 images: Special case - downloads actual image vs text (line 168)

### Stats Calculation
Two patterns exist:
1. **Inline** (JSON formatter, line 49): Calculates chars/lines/size immediately after format
2. **Helper function** `updateStats()` (line 706): Used by most other formatters

### Monaco Editor Config
Standard options applied to all editors (lines 897-905, 945-953):
- No minimap
- 14px font size
- Word wrap enabled
- Auto layout
- Padding top/bottom: 16px

## Vietnamese Language
README and UI use Vietnamese. When modifying user-facing text, maintain Vietnamese unless specifically requested otherwise.
