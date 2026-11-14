import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllTransactions,
  appendTransaction,
  deleteTransactionById
} from './lib/csvStorage.js';
import { validateTransaction, VALID_CATEGORIES } from './lib/validator.js';
import { calculateAnalytics, getMonthlyReport } from './lib/analytics.js';
import { seedIfEmpty } from './lib/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database with 220 seed transactions if empty
seedIfEmpty();

// ==========================================
// REST API Routes
// ==========================================

/**
 * GET /api/categories
 * Returns allowed categories for Income and Expense.
 */
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: VALID_CATEGORIES
  });
});

/**
 * GET /api/transactions
 * Fetch all transactions with optional filters:
 * ?month=YYYY-MM&type=Income|Expense&category=Food&search=keyword
 */
app.get('/api/transactions', (req, res) => {
  try {
    let transactions = getAllTransactions();
    const { month, type, category, search } = req.query;

    if (month && month !== 'all') {
      transactions = transactions.filter(t => t.date.startsWith(month));
    }

    if (type && type !== 'all') {
      transactions = transactions.filter(t => t.type.toLowerCase() === type.toLowerCase());
    }

    if (category && category !== 'all') {
      transactions = transactions.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.amount.toString().includes(q) ||
        t.date.includes(q)
      );
    }

    // Sort descending by date (latest first)
    transactions.sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Internal server error while fetching transactions.' });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction with server-side validation.
 */
app.post('/api/transactions', (req, res) => {
  try {
    const validation = validateTransaction(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        errors: validation.errors
      });
    }

    const { type, category, amount, date, description } = validation.sanitized;
    const uniqueId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newTransaction = {
      id: uniqueId,
      date,
      type,
      category,
      amount,
      description
    };

    appendTransaction(newTransaction);

    res.status(201).json({
      success: true,
      message: 'Transaction saved successfully.',
      transaction: newTransaction
    });
  } catch (error) {
    console.error('Error saving transaction:', error);
    res.status(500).json({ success: false, error: 'Internal server error while saving transaction.' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a specific transaction by id.
 */
app.delete('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required.' });
    }

    const deleted = deleteTransactionById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: `Transaction with ID '${id}' not found.` });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully.',
      id
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, error: 'Internal server error while deleting transaction.' });
  }
});

/**
 * GET /api/analytics
 * Returns summary metrics, chart series, and dynamic plain-language insights.
 * Optional query: ?month=YYYY-MM
 */
app.get('/api/analytics', (req, res) => {
  try {
    const transactions = getAllTransactions();
    const { month } = req.query;
    const analytics = calculateAnalytics(transactions, month);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    res.status(500).json({ success: false, error: 'Internal server error while generating analytics.' });
  }
});

/**
 * GET /api/reports/monthly
 * Returns aggregated monthly summary table data.
 */
app.get('/api/reports/monthly', (req, res) => {
  try {
    const transactions = getAllTransactions();
    const report = getMonthlyReport(transactions);

    res.json({
      success: true,
      count: report.length,
      report
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ success: false, error: 'Internal server error while generating monthly report.' });
  }
});

/**
 * GET /api/export/csv
 * Exports the filtered or full list of transactions as a downloadable CSV.
 */
app.get('/api/export/csv', (req, res) => {
  try {
    let transactions = getAllTransactions();
    const { month, type, category, search } = req.query;

    if (month && month !== 'all') {
      transactions = transactions.filter(t => t.date.startsWith(month));
    }
    if (type && type !== 'all') {
      transactions = transactions.filter(t => t.type.toLowerCase() === type.toLowerCase());
    }
    if (category && category !== 'all') {
      transactions = transactions.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.amount.toString().includes(q) ||
        t.date.includes(q)
      );
    }

    transactions.sort((a, b) => b.date.localeCompare(a.date));

    const escapeCsv = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = ['ID,Date,Type,Category,Amount,Description'];
    for (const t of transactions) {
      rows.push([
        escapeCsv(t.id),
        escapeCsv(t.date),
        escapeCsv(t.type),
        escapeCsv(t.category),
        escapeCsv(Number(t.amount).toFixed(2)),
        escapeCsv(t.description)
      ].join(','));
    }

    const csvContent = rows.join('\r\n');
    const filename = `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to export CSV.' });
  }
});

// HTML Page Route fallbacks
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/transactions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'transactions.html'));
});

app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`Expense Tracker Server running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`=================================================`);
});

export default app;
