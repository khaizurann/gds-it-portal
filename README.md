# IT Portal – IT Asset Management System

A web app to track office IT assets (PCs, laptops, monitors), who uses them, where they sit, and what's on loan, with an AI assistant for quick questions.

**Live demo:** https://it-portal.khaizuran.workers.dev
**Demo login:** username `demo` · password `demo123`

> Built from a real need during my IT Support internship, where ~40 PCs were tracked in Excel.
> The demo uses a fictional company ("Teslo") with dummy data. Real company data is confidential.

## Features
- **Dashboard**: asset counts by status, department and type, plus a "needs attention" list
- **AI assistant**: ask questions like *"How many laptops are available?"* (Cloudflare Workers AI, with a rule-based fallback)
- **Assets**: type tabs (PC, Laptop, Monitor…), search, filters, quick status change
- **Quick add**: pick a type, auto-generated tag (e.g. `TSL-PC-014`), auto-fill from the person, add monitors in one step
- **Office map**: drag-and-drop desks, see each desk's user and equipment, intern desks highlighted
- **Loans**: items taken home or to site, overdue alerts, item status restored on return
- **Staff**: staff and interns, deactivate when someone leaves
- **Sign-in page** with secure session cookies
- **Settings**: company name, asset tag prefix, departments, backup export/import

## Tech stack
| Part | Technology |
|---|---|
| Frontend | React, React Router, Tailwind CSS, Vite |
| Backend | Cloudflare Workers |
| AI | Cloudflare Workers AI (Llama 3.3 70B) |
| Hosting / CI/CD | Cloudflare, auto-deploy on every push to GitHub |
| Data (current) | Browser localStorage |
| Data (next) | Cloudflare D1 (SQL) |

## How it works
```
Browser ──► Cloudflare Worker ──► checks sign-in
                 │
                 ├─ /api/ask ──► Workers AI ──► answer
                 └─ other     ──► React website
```
All data access goes through one file (`src/data/DataContext.jsx`), so switching from browser storage to a database only changes that file.

## Project structure
```
src/
  pages/        Dashboard, Assets, Loans, Staff, OfficeMap, Settings
  components/   forms, popups, AI box, icons
  data/         data layer, sample data, AI helpers
worker/         backend: sign-in page, login, AI endpoint
wrangler.jsonc  Cloudflare settings
```

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:5173. Locally there is no sign-in, and the AI box uses quick answers. The real AI runs on Cloudflare.

## Roadmap
- [ ] Shared database (Cloudflare D1) so the whole team sees the same data
- [ ] User accounts with roles (admin / staff)
- [ ] Import an existing Excel asset list
- [ ] Mobile-friendly layout (currently desktop-first)

## Author
**Ahmad Khaizuran Haziq** – Diploma in Computer Science, UTM
[LinkedIn](https://linkedin.com/in/ahmadkhaizuran) · [GitHub](https://github.com/khaizurann)