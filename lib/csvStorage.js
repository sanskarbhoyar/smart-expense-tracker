import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const CSV_FILE = path.join(DATA_DIR, 'expenses.csv');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Escapes a single CSV field value.
 */
function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses a CSV line into an array of string values.
 */
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Reads all transactions from the CSV file.
 * Returns an array of Transaction objects:
 * { id, date, type, category, amount, description }
 */
export function getAllTransactions() {
  if (!fs.existsSync(CSV_FILE)) {
    return [];
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 5) continue;

    const tx = {
      id: row[0]?.trim() || '',
      date: row[1]?.trim() || '',
      type: row[2]?.trim() || '',
      category: row[3]?.trim() || '',
      amount: parseFloat(row[4]?.trim()) || 0,
      description: row[5]?.trim() || ''
    };

    if (tx.id && tx.date && tx.type && tx.category && !isNaN(tx.amount)) {
      transactions.push(tx);
    }
  }

  return transactions;
}

/**
 * Saves all transactions to the CSV file.
 */
export function saveAllTransactions(transactions) {
  const header = ['id', 'date', 'type', 'category', 'amount', 'description'];
  const lines = [header.join(',')];

  for (const tx of transactions) {
    const row = [
      escapeCsvField(tx.id),
      escapeCsvField(tx.date),
      escapeCsvField(tx.type),
      escapeCsvField(tx.category),
      escapeCsvField(Number(tx.amount).toFixed(2)),
      escapeCsvField(tx.description || '')
    ];
    lines.push(row.join(','));
  }

  fs.writeFileSync(CSV_FILE, lines.join('\n'), 'utf-8');
}

/**
 * Appends a single transaction to the CSV file.
 */
export function appendTransaction(tx) {
  const transactions = getAllTransactions();
  transactions.unshift(tx); // add new transaction to top
  saveAllTransactions(transactions);
  return tx;
}

/**
 * Deletes a transaction by id.
 */
export function deleteTransactionById(id) {
  const transactions = getAllTransactions();
  const initialLength = transactions.length;
  const filtered = transactions.filter(tx => tx.id !== id);

  if (filtered.length === initialLength) {
    return false; // not found
  }

  saveAllTransactions(filtered);
  return true;
}

export { CSV_FILE };
