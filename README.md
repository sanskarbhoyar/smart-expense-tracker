# Personal Expense Tracker with Dashboard

A complete Full-Stack web application for personal finance management and budget tracking built with a **Node.js + Express** backend, persistent **CSV data storage**, and a multi-page **Vanilla JS + Tailwind CSS + Chart.js** frontend (no SPA, no React).

---

## 🚀 Key Features

### 1. Backend (Node.js + Express + CSV Storage)
- **RESTful Endpoints**:
  - `GET /api/transactions`: Retrieve transactions with support for filters (`month`, `type`, `category`, `search`).
  - `POST /api/transactions`: Create new transactions with strict server-side validation.
  - `DELETE /api/transactions/:id`: Remove transactions by unique ID.
  - `GET /api/analytics`: Server-computed totals, category distributions, monthly comparisons, trends, and dynamic insights.
  - `GET /api/reports/monthly`: Aggregated monthly summaries (Income, Expense, Savings, Savings Rate %).
  - `GET /api/export/csv`: Export filtered or full transactions as a downloadable CSV.
  - `GET /api/categories`: Supported categories for Income and Expense.
- **Persistent Storage**: Data stored in `data/expenses.csv` with robust CSV escaping and parsing.
- **Data Model**: `id`, `date`, `type` (`Income` / `Expense`), `category`, `amount`, `description`.
- **Validation**:
  - Validates categories against allowed types.
  - Rejects zero, negative, or non-numeric amounts.
  - Rejects future dates.
  - Restricts description to max 100 characters.
- **Automated Seeding**: Populates `data/expenses.csv` with **220 realistic demonstration transactions** spanning 6 months on first boot.

---

### 2. Multi-Page Frontend Architecture
- **Three Distinct HTML Pages**:
  1. `index.html` — Financial Overview & Dashboard with Data Entry Form, 4 KPI cards, Chart.js visualizations, and automated insights.
  2. `transactions.html` — Full Transaction History table with Month, Type, and Category dropdown filters, search bar, Delete action modal, and CSV export.
  3. `report.html` — Monthly Financial Report table aggregating income, expenses, net savings, and savings rate per month with CSV export.
- **Styling**: Tailwind CSS & Font Awesome via CDN.
- **Data Visualization**: Chart.js for doughnut, grouped bar, smooth area line, and daily bar charts.
- **Communication**: Native `fetch()` API calls to backend REST endpoints with custom toast notifications.

---

## 🛠️ Project Structure

```
smart-expense-tracker/
├── package.json               # Project manifest and scripts
├── server.js                  # Main Express server and REST API routes
├── test.js                    # Verification test suite
├── data/
│   └── expenses.csv           # Persistent CSV database (220 seeded records)
├── lib/
│   ├── csvStorage.js          # CSV parsing, escaping, and persistence logic
│   ├── validator.js           # Server-side validation logic & categories
│   ├── analytics.js           # Financial metric calculation & dynamic insights
│   └── seedData.js            # Generator for 220 sample transactions across 6 months
└── public/
    ├── index.html             # Page 1: Dashboard & Data Entry Form
    ├── transactions.html      # Page 2: Transaction History & Management
    ├── report.html            # Page 3: Monthly Financial Report
    ├── css/
    │   └── styles.css         # Styling enhancements and custom animations
    └── js/
        ├── api.js             # API fetch wrapper, toasts, and formatters
        ├── navbar.js          # Active page highlighting and mobile drawer
        ├── dashboard.js       # Chart.js instances, metrics, and form handler
        ├── transactions.js    # Table pagination, filters, deletion, and CSV export
        └── report.js          # Monthly aggregation table and report export
```

---

## 🏁 Running the Application

### 1. Start the Server
```bash
npm start
```
Or for auto-reloading during development:
```bash
npm run dev
```

The application will be accessible at:
👉 **`http://localhost:3000`**

### 2. Run Self-Tests
```bash
npm test
```
