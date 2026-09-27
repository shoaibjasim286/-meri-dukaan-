# Meri Dukaan 🏪

Meri Dukaan is a simple shop-management app for Pakistani small businesses. It keeps sales, stock, credit, purchases, expenses, returns, staff permissions, daily closing, reports and backups in one place.

## 🇵🇰 Urdu + English

Meri Dukaan chhoti dukaan aur retail business ka roz ka hisaab asaan banane ke liye hai.

- **Bikri / Sales** — cash, udhaar aur mixed sales with validation.
- **Samaan / Stock** — products, stock levels, low-stock tracking aur stock adjustments.
- **Customers / Udhaar** — customer balances, payments aur credit history.
- **Suppliers / Kharid** — purchases, supplier balances, supplier payments aur returns.
- **Kharcha / Expenses** — business expenses ka record.
- **Wapsi / Returns** — customer returns aur supplier returns with accounting adjustments.
- **Reports** — sales, profit, expenses aur daily business summaries.
- **Daily Closing** — mode-wise cash breakdown aur end-of-day closing.
- **Staff & Permissions** — Owner, Manager, Cashier aur Sales Staff roles with granular permissions.
- **PIN Security** — 4-digit PIN, SHA-256 + per-staff salt, startup lock aur failed-attempt lockout.
- **Backup / Restore** — JSON backup download aur restore.
- **Print / Export / Share** — receipts aur business data ke print/export workflows.
- **Demo / Blank Mode** — fresh install blank state se start hoti hai; Settings se demo data load ya blank reset kiya ja sakta hai.
- **Local-first storage** — app data browser ke local storage mein persist hota hai.

## 🚀 Setup

Requirements: Node.js + npm.

```bash
npm install
npm run dev
```

Development server start hone ke baad terminal mein diye gaye local URL ko browser mein open karein.

Production build:

```bash
npm run build
npm run start
```

## 🧰 Tech Stack

- React 19
- TanStack Start
- TanStack Router
- Tailwind CSS 4
- TypeScript
- Vite
- Radix UI
- Lucide React
- Recharts
- jsPDF + AutoTable

## ⚠️ Known Limitations

- Data abhi browser-local storage par depend karta hai; built-in cloud sync ya multi-device database sync nahi hai.
- Browser/site data clear karne se local app data remove ho sakta hai. Regular JSON backups recommended hain.
- PIN security browser-side hai; ye server-side authentication system nahi hai.
- Demo data intentionally sample data hai aur real business records ka replacement nahi.
- Automatic purchase invoice numbers sequential hain; manually entered supplier invoice numbers user khud provide kar sakta hai.

## 📌 Version

**v1.0.0**
