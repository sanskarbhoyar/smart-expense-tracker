/**
 * Monthly Report Page Logic
 * Fetches aggregated monthly summary and renders interactive table, KPI totals, and export.
 */

let monthlyReportData = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchMonthlyReport();
  setupReportEventListeners();
});

/**
 * Fetches grouped monthly data from backend.
 */
async function fetchMonthlyReport() {
  const tableBody = document.getElementById('report-table-body');
  const loading = document.getElementById('report-loading');
  const empty = document.getElementById('report-empty-state');

  if (loading) loading.classList.remove('hidden');
  if (empty) empty.classList.add('hidden');

  try {
    const res = await apiRequest('/api/reports/monthly');
    if (res.success) {
      monthlyReportData = res.report;
      renderReportTable(monthlyReportData);
      renderReportSummaryCards(monthlyReportData);
    }
  } catch (err) {
    console.error('Failed to load monthly report:', err);
    showToast('Failed to load report: ' + err.message, 'error');
  } finally {
    if (loading) loading.classList.add('hidden');
  }
}

/**
 * Sets up CSV export and other event listeners.
 */
function setupReportEventListeners() {
  const exportBtn = document.getElementById('btn-export-report-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportReportCsv);
  }
}

/**
 * Renders the monthly report table.
 */
function renderReportTable(data) {
  const tableBody = document.getElementById('report-table-body');
  const empty = document.getElementById('report-empty-state');

  if (!tableBody) return;

  if (!data || data.length === 0) {
    tableBody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;

  tableBody.innerHTML = data.map(row => {
    totalIncome += row.income;
    totalExpense += row.expense;
    totalSavings += row.savings;

    const isPositive = row.savings >= 0;
    const savingsClass = isPositive ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
    const savingsPrefix = isPositive ? '+' : '';

    // Savings Rate Progress styling
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let barColor = 'bg-emerald-500';

    if (row.savingsRate < 0) {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      barColor = 'bg-rose-500';
    } else if (row.savingsRate < 20) {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      barColor = 'bg-amber-500';
    }

    const cappedPct = Math.max(0, Math.min(100, row.savingsRate));

    return `
      <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
              <i class="fa-solid fa-calendar"></i>
            </div>
            <div>
              <div class="font-bold text-slate-900">${formatMonth(row.month)}</div>
              <div class="text-[11px] font-mono text-slate-400">${row.month} &bull; ${row.count} txns</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-emerald-600">
          +${formatCurrency(row.income)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-rose-600">
          -${formatCurrency(row.expense)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm ${savingsClass}">
          ${savingsPrefix}${formatCurrency(row.savings)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center justify-end gap-3">
            <div class="w-24 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
              <div class="${barColor} h-2 rounded-full" style="width: ${cappedPct}%"></div>
            </div>
            <span class="inline-flex items-center justify-center min-w-[64px] px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}">
              ${row.savingsRate.toFixed(1)}%
            </span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Update Table Footer Totals
  const overallRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : '0.0';
  const footIncome = document.getElementById('foot-total-income');
  const footExpense = document.getElementById('foot-total-expense');
  const footSavings = document.getElementById('foot-total-savings');
  const footRate = document.getElementById('foot-total-rate');

  if (footIncome) footIncome.textContent = formatCurrency(totalIncome);
  if (footExpense) footExpense.textContent = formatCurrency(totalExpense);
  if (footSavings) footSavings.textContent = formatCurrency(totalSavings);
  if (footRate) footRate.textContent = `${overallRate}%`;
}

/**
 * Updates top summary KPI cards on report page.
 */
function renderReportSummaryCards(data) {
  if (!data || data.length === 0) return;

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
  const totalSavings = totalIncome - totalExpense;
  const overallRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;

  // Best savings month
  const bestSavingsMonth = [...data].sort((a, b) => b.savings - a.savings)[0];

  const cardIncome = document.getElementById('report-kpi-income');
  const cardExpense = document.getElementById('report-kpi-expense');
  const cardSavings = document.getElementById('report-kpi-savings');
  const cardRate = document.getElementById('report-kpi-rate');
  const cardBestMonth = document.getElementById('report-best-month');

  if (cardIncome) cardIncome.textContent = formatCurrency(totalIncome);
  if (cardExpense) cardExpense.textContent = formatCurrency(totalExpense);
  if (cardSavings) cardSavings.textContent = formatCurrency(totalSavings);
  if (cardRate) cardRate.textContent = `${overallRate}%`;
  if (cardBestMonth && bestSavingsMonth) {
    cardBestMonth.textContent = `${formatShortMonth(bestSavingsMonth.month)} (${formatCurrency(bestSavingsMonth.savings)})`;
  }
}

/**
 * Exports the monthly aggregation as a CSV file.
 */
function handleExportReportCsv() {
  if (!monthlyReportData || monthlyReportData.length === 0) {
    showToast('No monthly report data available to export.', 'info');
    return;
  }

  const rows = ['Month,Income,Expense,Savings,Savings Rate (%)'];
  monthlyReportData.forEach(r => {
    rows.push([
      r.month,
      r.income.toFixed(2),
      r.expense.toFixed(2),
      r.savings.toFixed(2),
      r.savingsRate.toFixed(1)
    ].join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\r\n'));
  const a = document.createElement('a');
  a.setAttribute('href', csvContent);
  a.setAttribute('download', `monthly_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('Monthly report exported to CSV.', 'success');
}
