# Barcode Wallet

A progressive web app (PWA) that scans a barcode from a bill — via live camera, image file, or PDF — and displays it as a clean virtual barcode you can show at a payment terminal.

## Features

- **Live camera** — continuous scanning with rear-camera preference on mobile
- **Image upload / drop** — JPG, PNG, WEBP, GIF
- **PDF upload / drop** — renders each page at high DPI for reliable detection
- **Auto-detects** QR Code, Data Matrix, PDF 417, Aztec, Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF, GS1 DataBar
- **Virtual barcode** — re-renders the decoded value as a crisp barcode on a white card
- **Copy value** — copies the raw barcode text to the clipboard
- **PWA** — installable, works offline after first load

## Requirements

- Node ≥ 20
- Modern browser with camera permissions (for live scanning)

## Setup

```bash
npm install
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Architecture

```
src/
  js/
    scanner.js        # ZXing camera / canvas scanning
    pdf-reader.js     # PDF.js → canvas rendering
    barcode-display.js # bwip-js virtual barcode renderer
    app.js            # UI orchestration
  css/
    styles.css        # Mobile-first dark theme
```
