/**
 * Dashboard Logic - Chart.js visualizations, metrics, and transaction form handling
 */

// Category options
const CATEGORIES = {
  Expense: [
    'Food',
    'Rent',
    'Travel',
    'Shopping',
    'Bills',
    'Education',
    'Health',
    'Entertainment',
    'Other'
  ],
  Income: [
    'Pocket Money',
    'Salary',
    'Freelance',
    'Other Income'
  ]
};

// Global Chart references for clean update/destroy
let categoryChartInstance = null;
let monthBarChartInstance = null;
let trendLineChartInstance = null;
let dailyExpenseChartInstance = null;

let currentSelectedMonth = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initForm();
  loadDashboardData();
  setupEventListeners();
});

/**
 * Initializes form defaults and category options.
 */
function initForm() {
  const dateInput = document.getElementById('tx-date');
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.value = today;
    dateInput.max = today; // Enforce no future dates in native UI picker
  }

  // Update categories based on default selected type (Expense)
  updateCategoryDropdown('Expense');

  // Character counter for description
  const descInput = document.getElementById('tx-description');
  const charCounter = document.getElementById('desc-char-count');
  if (descInput && charCounter) {
    descInput.addEventListener('input', () => {
      charCounter.textContent = `${descInput.value.length}/100`;
    });
  }
}

/**
 * Populates category dropdown options based on type.
 */
function updateCategoryDropdown(type) {
  const categorySelect = document.getElementById('tx-category');
  if (!categorySelect) return;

  const options = CATEGORIES[type] || [];
  categorySelect.innerHTML = options
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
}

/**
 * Setup event listeners for form toggles and month selector.
 */
function setupEventListeners() {
  // Type Radio Buttons / segmented toggle
  const typeRadios = document.querySelectorAll('input[name="tx-type"]');
  typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateCategoryDropdown(e.target.value);
      updateTypeStyling(e.target.value);
    });
  });

  // Month selector
  const monthSelector = document.getElementById('global-month-filter');
  if (monthSelector) {
    monthSelector.addEventListener('change', (e) => {
      currentSelectedMonth = e.target.value;
      loadDashboardData(currentSelectedMonth);
    });
  }

  // Transaction form submission
  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

/**
 * Visual pill styling for type radio buttons.
 */
function updateTypeStyling(selectedType) {
  const expenseLabel = document.getElementById('type-label-expense');
  const incomeLabel = document.getElementById('type-label-income');

  if (selectedType === 'Expense') {
    expenseLabel.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all bg-rose-50 border-rose-300 text-rose-700 shadow-sm';
    incomeLabel.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50';
  } else {
    expenseLabel.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50';
    incomeLabel.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm';
  }
}

/**
 * Handles transaction form submission with server validation and feedback.
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const formError = document.getElementById('form-error');
  formError.classList.add('hidden');
  formError.textContent = '';

  const submitBtn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-btn-text');
  const submitSpinner = document.getElementById('submit-btn-spinner');

  // Gather values
  const typeElem = document.querySelector('input[name="tx-type"]:checked');
  const type = typeElem ? typeElem.value : 'Expense';
  const date = document.getElementById('tx-date').value.trim();
  const category = document.getElementById('tx-category').value.trim();
  const amountStr = document.getElementById('tx-amount').value.trim();
  const description = document.getElementById('tx-description').value.trim();

  // Client validation
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    displayFormError('Please enter a valid amount greater than $0.00.');
    return;
  }

  if (!date) {
    displayFormError('Please select a valid date.');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (date > todayStr) {
    displayFormError(`Date cannot be in the future (today is ${todayStr}).`);
    return;
  }

  if (!category) {
    displayFormError('Please select a category.');
    return;
  }

  if (description.length > 100) {
    displayFormError('Description cannot exceed 100 characters.');
    return;
  }

  // Set loading state
  submitBtn.disabled = true;
  submitText.textContent = 'Saving...';
  submitSpinner.classList.remove('hidden');

  try {
    const payload = {
      type,
      date,
      category,
      amount,
      description
    };

    const res = await apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showToast(`Transaction added: ${category} (${formatCurrency(amount)})`, 'success');

    // Reset form inputs (preserve date as today)
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-description').value = '';
    document.getElementById('desc-char-count').textContent = '0/100';

    // Reload analytics
    await loadDashboardData(currentSelectedMonth);
  } catch (err) {
    displayFormError(err.message || 'Failed to save transaction.');
    showToast(err.message || 'Failed to save transaction.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Save Transaction';
    submitSpinner.classList.add('hidden');
  }
}

function displayFormError(msg) {
  const formError = document.getElementById('form-error');
  formError.textContent = msg;
  formError.classList.remove('hidden');
  formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Fetches analytics from backend and updates UI.
 */
async function loadDashboardData(month = 'all') {
  try {
    const url = month && month !== 'all'
      ? `/api/analytics?month=${encodeURIComponent(month)}`
      : '/api/analytics';

    const data = await apiRequest(url);
    if (!data.success) {
      throw new Error(data.error || 'Failed to load dashboard data.');
    }

    const { totals, categoryBreakdown, monthlyData, dailyExpenses, availableMonths, insights } = data.analytics;

    // 1. Populate month filter dropdown if not yet populated or on initial load
    populateMonthSelector(availableMonths, month);

    // 2. Render Metric Cards
    renderMetricCards(totals);

    // 3. Render Expense Category Pie Chart
    renderCategoryChart(categoryBreakdown);

    // 4. Render Month-Wise Income vs Expense Bar Chart
    renderMonthBarChart(monthlyData);

    // 5. Render Monthly Trend Line Chart
    renderTrendLineChart(monthlyData);

    // 6. Conditional Daily Expense Bar Chart
    renderDailyExpenseChart(dailyExpenses, month);

    // 7. Dynamic Insights Panel
    renderInsights(insights);

  } catch (err) {
    console.error('Error loading dashboard:', err);
    showToast('Failed to refresh dashboard: ' + err.message, 'error');
  }
}

/**
 * Populates global month selector options.
 */
function populateMonthSelector(months, activeMonth) {
  const selector = document.getElementById('global-month-filter');
  if (!selector) return;

  const currentVal = activeMonth || selector.value || 'all';

  let html = `<option value="all">All Months (Overall)</option>`;
  months.forEach(m => {
    html += `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${formatMonth(m)}</option>`;
  });

  selector.innerHTML = html;
  selector.value = currentVal;
}

/**
 * Updates 4 KPI metric cards.
 */
function renderMetricCards(totals) {
  const { totalIncome, totalExpenses, balance, savingsRate } = totals;

  const incomeEl = document.getElementById('metric-income');
  const expenseEl = document.getElementById('metric-expense');
  const balanceEl = document.getElementById('metric-balance');
  const rateEl = document.getElementById('metric-savings-rate');

  if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
  if (expenseEl) expenseEl.textContent = formatCurrency(totalExpenses);

  if (balanceEl) {
    balanceEl.textContent = formatCurrency(balance);
    if (balance >= 0) {
      balanceEl.classList.remove('text-rose-600');
      balanceEl.classList.add('text-indigo-600');
    } else {
      balanceEl.classList.remove('text-indigo-600');
      balanceEl.classList.add('text-rose-600');
    }
  }

  if (rateEl) {
    rateEl.textContent = `${savingsRate.toFixed(1)}%`;
    const rateBadge = document.getElementById('metric-rate-badge');
    if (rateBadge) {
      if (savingsRate >= 20) {
        rateBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
        rateBadge.textContent = 'Healthy';
      } else if (savingsRate > 0) {
        rateBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
        rateBadge.textContent = 'Moderate';
      } else {
        rateBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
        rateBadge.textContent = 'Deficit';
      }
    }
  }
}

/**
 * Renders Recharts/Chart.js Pie Chart for Expenses by Category.
 */
function renderCategoryChart(categoryBreakdown) {
  const ctx = document.getElementById('categoryPieChart');
  if (!ctx) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const emptyPlaceholder = document.getElementById('category-empty-state');
  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    ctx.classList.add('hidden');
    if (emptyPlaceholder) emptyPlaceholder.classList.remove('hidden');
    return;
  }

  ctx.classList.remove('hidden');
  if (emptyPlaceholder) emptyPlaceholder.classList.add('hidden');

  const labels = categoryBreakdown.map(c => c.category);
  const data = categoryBreakdown.map(c => c.amount);
  const backgroundColors = categoryBreakdown.map(c => getCategoryColor(c.category).hex);

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 14,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12,
              weight: '500'
            },
            color: '#334155'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13 },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const val = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${label}: ${formatCurrency(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Renders Grouped Bar Chart: Month-wise Income vs. Expense.
 */
function renderMonthBarChart(monthlyData) {
  const ctx = document.getElementById('monthBarChart');
  if (!ctx) return;

  if (monthBarChartInstance) {
    monthBarChartInstance.destroy();
  }

  const labels = monthlyData.map(m => formatShortMonth(m.month));
  const incomeData = monthlyData.map(m => m.income);
  const expenseData = monthlyData.map(m => m.expense);

  monthBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: '#10b981', // Emerald 500
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        {
          label: 'Expense',
          data: expenseData,
          backgroundColor: '#f43f5e', // Rose 500
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748b'
          }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748b',
            callback: value => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            color: '#334155'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: context => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    }
  });
}

/**
 * Renders Line Chart: Monthly expense and savings trend.
 */
function renderTrendLineChart(monthlyData) {
  const ctx = document.getElementById('trendLineChart');
  if (!ctx) return;

  if (trendLineChartInstance) {
    trendLineChartInstance.destroy();
  }

  const labels = monthlyData.map(m => formatShortMonth(m.month));
  const expenseData = monthlyData.map(m => m.expense);
  const savingsData = monthlyData.map(m => m.savings);

  trendLineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Savings',
          data: savingsData,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748b'
          }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748b',
            callback: value => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            color: '#334155'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: context => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    }
  });
}

/**
 * Bar Chart (Conditional): If a specific month is filtered, show a daily expense bar chart for that month.
 */
function renderDailyExpenseChart(dailyExpenses, selectedMonth) {
  const container = document.getElementById('daily-chart-card');
  const ctx = document.getElementById('dailyExpenseChart');
  if (!container || !ctx) return;

  if (dailyExpenseChartInstance) {
    dailyExpenseChartInstance.destroy();
  }

  // If "all", hide the conditional daily expense section or show helper state
  if (!selectedMonth || selectedMonth === 'all' || !dailyExpenses || dailyExpenses.length === 0) {
    container.classList.add('hidden');
    return;
  }

  // Show container
  container.classList.remove('hidden');

  const monthTitle = document.getElementById('daily-chart-month-name');
  if (monthTitle) {
    monthTitle.textContent = formatMonth(selectedMonth);
  }

  const labels = dailyExpenses.map(d => `Day ${d.dayLabel}`);
  const data = dailyExpenses.map(d => d.amount);

  dailyExpenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Spending',
          data,
          backgroundColor: '#6366f1', // Indigo 500
          hoverBackgroundColor: '#4f46e5',
          borderRadius: 4,
          barPercentage: 0.65
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 },
            color: '#64748b'
          }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748b',
            callback: value => `$${value}`
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            title: items => {
              const idx = items[0].dataIndex;
              return dailyExpenses[idx] ? formatDate(dailyExpenses[idx].day) : '';
            },
            label: context => ` Expense: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    }
  });
}

/**
 * Renders Dynamic Insights Panel.
 */
function renderInsights(insights) {
  const container = document.getElementById('insights-container');
  if (!container) return;

  if (!insights || insights.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500 text-sm">No insights available for this period yet.</div>`;
    return;
  }

  const iconMap = {
    spending: { icon: 'fa-chart-pie', color: 'text-rose-500', bg: 'bg-rose-50' },
    income: { icon: 'fa-wallet', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    health: { icon: 'fa-shield-heart', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    performance: { icon: 'fa-trophy', color: 'text-amber-500', bg: 'bg-amber-50' },
    average: { icon: 'fa-calculator', color: 'text-sky-500', bg: 'bg-sky-50' },
    filter: { icon: 'fa-calendar-check', color: 'text-purple-500', bg: 'bg-purple-50' }
  };

  container.innerHTML = insights.map(item => {
    const meta = iconMap[item.type] || { icon: 'fa-lightbulb', color: 'text-indigo-500', bg: 'bg-indigo-50' };
    return `
      <div class="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm card-hover">
        <div class="w-10 h-10 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 text-base font-bold">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div class="flex-1">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">${item.title}</h4>
          <p class="text-sm font-medium text-slate-700 leading-relaxed">${item.text}</p>
        </div>
      </div>
    `;
  }).join('');
}
