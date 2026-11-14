import { getAllTransactions } from './lib/csvStorage.js';
import { validateTransaction } from './lib/validator.js';
import { calculateAnalytics, getMonthlyReport } from './lib/analytics.js';

console.log('--- Running Personal Expense Tracker Self-Test ---');

// 1. Check CSV storage
const txs = getAllTransactions();
console.log(`[Storage] Loaded ${txs.length} transactions from data/expenses.csv`);
if (txs.length === 0) {
  throw new Error('Expected at least 220 seeded transactions, found 0.');
}

// 2. Validate all transactions
const invalid = txs.filter(t => !validateTransaction(t).valid);
console.log(`[Validation] Checked all ${txs.length} transactions: ${invalid.length} errors.`);
if (invalid.length > 0) {
  throw new Error(`Found ${invalid.length} invalid transactions.`);
}

// 3. Test Analytics
const analytics = calculateAnalytics(txs);
console.log(`[Analytics] Total Income: $${analytics.totals.totalIncome}`);
console.log(`[Analytics] Total Expenses: $${analytics.totals.totalExpenses}`);
console.log(`[Analytics] Net Balance: $${analytics.totals.balance}`);
console.log(`[Analytics] Savings Rate: ${analytics.totals.savingsRate}%`);
console.log(`[Analytics] Dynamic Insights: ${analytics.insights.length} generated.`);
console.log(`[Analytics] Expense Categories: ${analytics.categoryBreakdown.length} categories.`);

// 4. Test Monthly Report
const report = getMonthlyReport(txs);
console.log(`[Monthly Report] Aggregated ${report.length} months.`);
report.forEach(m => {
  console.log(`  - ${m.month}: Income $${m.income}, Expense $${m.expense}, Savings $${m.savings} (${m.savingsRate}%)`);
});

// 5. Test Server Validation Edge Cases
const badAmount = validateTransaction({ type: 'Expense', category: 'Food', amount: -5, date: '2026-11-14' });
if (badAmount.valid) throw new Error('Expected negative amount to fail validation.');

const futureDate = validateTransaction({ type: 'Income', category: 'Salary', amount: 1000, date: '2028-01-01' });
if (futureDate.valid) throw new Error('Expected future date to fail validation.');

const badCategory = validateTransaction({ type: 'Expense', category: 'InvalidCategory', amount: 50, date: '2026-11-14' });
if (badCategory.valid) throw new Error('Expected invalid category to fail validation.');

console.log('✓ All verification tests passed successfully!');
