/**
 * Formats a number as a currency string.
 */
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(val);
}

/**
 * Calculates analytics for given transactions, optionally filtered by month.
 */
export function calculateAnalytics(transactions, selectedMonth = null) {
  // Filter by month if provided (format: YYYY-MM)
  let workingList = transactions;
  if (selectedMonth && selectedMonth !== 'all') {
    workingList = transactions.filter(t => t.date.startsWith(selectedMonth));
  }

  // 1. Totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryExpenses = {};
  const categoryIncomes = {};
  const dailyExpenses = {};

  for (const t of workingList) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'Income') {
      totalIncome += amt;
      categoryIncomes[t.category] = (categoryIncomes[t.category] || 0) + amt;
    } else if (t.type === 'Expense') {
      totalExpenses += amt;
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + amt;

      // Track daily expenses for the active month or selected period
      const day = t.date; // YYYY-MM-DD
      dailyExpenses[day] = (dailyExpenses[day] || 0) + amt;
    }
  }

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0
    ? parseFloat(((balance / totalIncome) * 100).toFixed(1))
    : 0;

  // 2. Category Breakdown (for Expenses Pie Chart)
  const categoryBreakdown = Object.entries(categoryExpenses)
    .map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
      percentage: totalExpenses > 0
        ? parseFloat(((amount / totalExpenses) * 100).toFixed(1))
        : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Month-wise Aggregation (across all transactions or chronologically)
  // Even if a specific month is filtered for metrics, the monthly trend charts need historical perspective
  const monthMap = {};
  for (const t of transactions) {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!monthMap[month]) {
      monthMap[month] = {
        month,
        income: 0,
        expense: 0,
        count: 0
      };
    }
    const amt = Number(t.amount) || 0;
    if (t.type === 'Income') {
      monthMap[month].income += amt;
    } else if (t.type === 'Expense') {
      monthMap[month].expense += amt;
    }
    monthMap[month].count++;
  }

  // Sort chronologically ascending for charts
  const sortedMonths = Object.keys(monthMap).sort();
  const monthlyData = sortedMonths.map(m => {
    const item = monthMap[m];
    const inc = parseFloat(item.income.toFixed(2));
    const exp = parseFloat(item.expense.toFixed(2));
    const sav = parseFloat((inc - exp).toFixed(2));
    const rate = inc > 0 ? parseFloat(((sav / inc) * 100).toFixed(1)) : 0;
    return {
      month: m,
      income: inc,
      expense: exp,
      savings: sav,
      savingsRate: rate,
      transactionCount: item.count
    };
  });

  // 4. Daily Expenses Array (if a specific month is filtered)
  let dailyExpensesList = [];
  if (selectedMonth && selectedMonth !== 'all') {
    // Generate all days in that month up to current or days present
    dailyExpensesList = Object.keys(dailyExpenses)
      .sort()
      .map(day => ({
        day, // YYYY-MM-DD
        dayLabel: day.substring(8), // DD
        amount: parseFloat(dailyExpenses[day].toFixed(2))
      }));
  }

  // 5. Dynamic Plain-Language Insights
  const insights = generateInsights({
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    categoryBreakdown,
    categoryIncomes,
    monthlyData,
    selectedMonth,
    transactionCount: workingList.length
  });

  // Available distinct months for dropdown filter
  const availableMonths = Object.keys(monthMap).sort().reverse();

  return {
    period: selectedMonth || 'all',
    totals: {
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      savingsRate
    },
    categoryBreakdown,
    monthlyData,
    dailyExpenses: dailyExpensesList,
    availableMonths,
    insights
  };
}

/**
 * Generates natural plain-language insights based on financial performance.
 */
function generateInsights({
  totalIncome,
  totalExpenses,
  balance,
  savingsRate,
  categoryBreakdown,
  categoryIncomes,
  monthlyData,
  selectedMonth,
  transactionCount
}) {
  const list = [];

  // Insight 1: Highest spending category
  if (categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0];
    list.push({
      type: 'spending',
      icon: 'pie-chart',
      title: 'Top Expense Category',
      text: `Highest spending category: ${topCat.category} (${formatCurrency(topCat.amount)}, accounting for ${topCat.percentage}% of all expenses).`
    });
  }

  // Insight 2: Primary income source
  const topIncomeEntry = Object.entries(categoryIncomes)
    .sort((a, b) => b[1] - a[1])[0];
  if (topIncomeEntry && totalIncome > 0) {
    const pct = ((topIncomeEntry[1] / totalIncome) * 100).toFixed(1);
    list.push({
      type: 'income',
      icon: 'wallet',
      title: 'Primary Income Stream',
      text: `Main income contributor: ${topIncomeEntry[0]} (${formatCurrency(topIncomeEntry[1])}, representing ${pct}% of total earnings).`
    });
  }

  // Insight 3: Savings rate assessment
  if (totalIncome > 0) {
    let healthStatus = '';
    let healthColor = 'emerald';
    if (savingsRate >= 35) {
      healthStatus = `Exceptional savings discipline: You are retaining ${savingsRate}% of your earnings, well above the recommended 20% benchmark.`;
      healthColor = 'emerald';
    } else if (savingsRate >= 20) {
      healthStatus = `Solid financial cushion: A ${savingsRate}% savings rate keeps your budget resilient and well-balanced.`;
      healthColor = 'blue';
    } else if (savingsRate > 0) {
      healthStatus = `Moderate savings margin: Retaining ${savingsRate}%. Consider reviewing secondary expenses like Shopping or Entertainment to boost reserves.`;
      healthColor = 'amber';
    } else {
      healthStatus = `Deficit warning: Expenses exceed income by ${formatCurrency(Math.abs(balance))}. Immediate budget trimming is recommended.`;
      healthColor = 'rose';
    }
    list.push({
      type: 'health',
      icon: 'trending-up',
      title: 'Savings Health Analysis',
      text: healthStatus,
      badgeColor: healthColor
    });
  }

  // Insight 4: Best month for savings
  if (monthlyData.length > 1) {
    const bestMonth = [...monthlyData].sort((a, b) => b.savings - a.savings)[0];
    if (bestMonth && bestMonth.savings > 0) {
      list.push({
        type: 'performance',
        icon: 'trophy',
        title: 'Peak Savings Period',
        text: `Best performing month was ${bestMonth.month} with ${formatCurrency(bestMonth.savings)} preserved (${bestMonth.savingsRate}% savings rate).`
      });
    }

    // Average monthly spending
    const avgExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0) / monthlyData.length;
    list.push({
      type: 'average',
      icon: 'calculator',
      title: 'Monthly Spending Baseline',
      text: `Your average monthly expenditure is ${formatCurrency(avgExpense)} across ${monthlyData.length} recorded months.`
    });
  }

  // Insight 5: Contextual detail if month filtered
  if (selectedMonth && selectedMonth !== 'all') {
    list.push({
      type: 'filter',
      icon: 'calendar',
      title: 'Period Summary',
      text: `Analyzing ${transactionCount} transactions for ${selectedMonth}. Net surplus for this period: ${formatCurrency(balance)}.`
    });
  }

  return list;
}

/**
 * Returns grouped monthly report data.
 */
export function getMonthlyReport(transactions) {
  const monthMap = {};

  for (const t of transactions) {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!monthMap[month]) {
      monthMap[month] = {
        month,
        income: 0,
        expense: 0,
        count: 0
      };
    }
    const amt = Number(t.amount) || 0;
    if (t.type === 'Income') {
      monthMap[month].income += amt;
    } else if (t.type === 'Expense') {
      monthMap[month].expense += amt;
    }
    monthMap[month].count++;
  }

  // Sort descending by month (latest first)
  const sortedMonths = Object.keys(monthMap).sort().reverse();

  return sortedMonths.map(m => {
    const item = monthMap[m];
    const income = parseFloat(item.income.toFixed(2));
    const expense = parseFloat(item.expense.toFixed(2));
    const savings = parseFloat((income - expense).toFixed(2));
    const savingsRate = income > 0
      ? parseFloat(((savings / income) * 100).toFixed(1))
      : 0;

    return {
      month: m,
      income,
      expense,
      savings,
      savingsRate,
      count: item.count
    };
  });
}
