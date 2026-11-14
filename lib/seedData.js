import { getAllTransactions, saveAllTransactions } from './csvStorage.js';

/**
 * Generates 220 realistic sample transactions spanning 6 months (June 2026 to November 2026).
 */
export function generateSeedTransactions() {
  const transactions = [];
  let idCounter = 1000;

  const months = [
    { year: 2026, month: 6, maxDay: 30, name: 'June 2026' },
    { year: 2026, month: 7, maxDay: 31, name: 'July 2026' },
    { year: 2026, month: 8, maxDay: 31, name: 'August 2026' },
    { year: 2026, month: 9, maxDay: 30, name: 'September 2026' },
    { year: 2026, month: 10, maxDay: 31, name: 'October 2026' },
    { year: 2026, month: 11, maxDay: 14, name: 'November 2026' }, // up to current date 2026-11-14
  ];

  const formatDay = (y, m, d) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Templates for realistic transactions
  const expenseTemplates = {
    Rent: [
      { desc: 'Monthly Apartment Rent', amount: 1250 }
    ],
    Bills: [
      { desc: 'High-speed Fiber Internet', amount: 65.0 },
      { desc: 'Electric & Heating Utility', amount: 95.5 },
      { desc: 'Mobile Phone Plan', amount: 45.0 },
      { desc: 'Water & Waste Management', amount: 35.0 }
    ],
    Food: [
      { desc: 'Weekly Supermarket Groceries', min: 75, max: 140 },
      { desc: 'Organic Farmers Market', min: 45, max: 80 },
      { desc: 'Italian Bistro Dinner', min: 55, max: 95 },
      { desc: 'Artisan Coffee & Bakery', min: 12, max: 24 },
      { desc: 'Healthy Lunch Salad Bowl', min: 14, max: 22 },
      { desc: 'Weekend Food Delivery', min: 32, max: 58 },
      { desc: 'Corner Bakery Fresh Pastries', min: 10, max: 18 }
    ],
    Travel: [
      { desc: 'Monthly Metro Transit Pass', amount: 80.0 },
      { desc: 'Ride-share Airport Commute', min: 28, max: 55 },
      { desc: 'Gas Station Fuel Refill', min: 42, max: 68 },
      { desc: 'Intercity Train Ticket', min: 35, max: 75 }
    ],
    Shopping: [
      { desc: 'Casual Weekend Apparel', min: 45, max: 110 },
      { desc: 'Home Living Decor & Plants', min: 30, max: 75 },
      { desc: 'Kitchenware & Utensils', min: 25, max: 60 },
      { desc: 'Tech Accessories & Cables', min: 20, max: 50 },
      { desc: 'Books & Stationery Supplies', min: 22, max: 48 }
    ],
    Entertainment: [
      { desc: 'IMAX Cinema Tickets & Popcorn', min: 24, max: 42 },
      { desc: 'Streaming Media Subscriptions', amount: 29.99 },
      { desc: 'Live Jazz Concert Ticket', min: 50, max: 85 },
      { desc: 'Board Games & Gaming Pass', min: 15, max: 35 }
    ],
    Education: [
      { desc: 'Web Development Certification', min: 49, max: 120 },
      { desc: 'Technical E-Books & Reference', min: 28, max: 55 }
    ],
    Health: [
      { desc: 'Monthly Gym Membership', amount: 55.0 },
      { desc: 'Pharmacy Vitamins & Supplements', min: 25, max: 45 },
      { desc: 'Dental Hygiene Routine Checkup', amount: 110.0 }
    ],
    Other: [
      { desc: 'Postal Shipping & Parcel Services', min: 14, max: 30 },
      { desc: 'Home Hardware & Key Duplication', min: 18, max: 35 }
    ]
  };

  const incomeTemplates = [
    { cat: 'Salary', desc: 'Monthly Corporate Salary', amount: 4200.0, day: 1 },
    { cat: 'Freelance', desc: 'UI/UX Design Consultation', min: 450, max: 850, day: 12 },
    { cat: 'Freelance', desc: 'Frontend Development Project', min: 600, max: 1100, day: 22 },
    { cat: 'Pocket Money', desc: 'Family Allowance / Gift', min: 80, max: 150, day: 15 },
    { cat: 'Other Income', desc: 'Investment Dividend Payout', min: 65, max: 140, day: 26 }
  ];

  // Specific per-month distribution targeting exactly 220 items total:
  // Month 1 (June): 37 items
  // Month 2 (July): 37 items
  // Month 3 (August): 38 items
  // Month 4 (September): 37 items
  // Month 5 (October): 38 items
  // Month 6 (November - 14 days): 33 items
  // Total = 37 + 37 + 38 + 37 + 38 + 33 = 220!

  const targetPerMonth = [37, 37, 38, 37, 38, 33];

  months.forEach((mObj, idx) => {
    const monthItems = [];
    const targetCount = targetPerMonth[idx];
    const { year, month, maxDay } = mObj;

    // 1. Income entries for this month (3 to 4 per month)
    // Primary salary
    monthItems.push({
      date: formatDay(year, month, Math.min(1, maxDay)),
      type: 'Income',
      category: 'Salary',
      amount: 4200.0,
      description: 'Monthly Corporate Salary'
    });

    // Freelance 1
    if (maxDay >= 10) {
      monthItems.push({
        date: formatDay(year, month, Math.min(10, maxDay)),
        type: 'Income',
        category: 'Freelance',
        amount: 650.0 + (idx * 45),
        description: 'Web Application Consulting'
      });
    }

    // Secondary Income or Pocket Money
    if (maxDay >= 14) {
      monthItems.push({
        date: formatDay(year, month, Math.min(14, maxDay)),
        type: 'Income',
        category: (idx % 2 === 0) ? 'Pocket Money' : 'Other Income',
        amount: 120.0 + (idx * 15),
        description: (idx % 2 === 0) ? 'Holiday Gift & Allowance' : 'Stock Dividend Distribution'
      });
    }

    // Additional Freelance if month has full days
    if (maxDay >= 22) {
      monthItems.push({
        date: formatDay(year, month, 22),
        type: 'Income',
        category: 'Freelance',
        amount: 780.0 + (idx * 30),
        description: 'Frontend Widget Development'
      });
    }

    // 2. Fixed Expenses
    // Rent
    monthItems.push({
      date: formatDay(year, month, Math.min(1, maxDay)),
      type: 'Expense',
      category: 'Rent',
      amount: 1250.0,
      description: 'Monthly Apartment Rent'
    });

    // Bills
    const billDays = [4, 7, 11, 13];
    const billDefs = expenseTemplates.Bills;
    billDefs.forEach((b, bIdx) => {
      const bDay = billDays[bIdx] || 5;
      if (bDay <= maxDay) {
        monthItems.push({
          date: formatDay(year, month, bDay),
          type: 'Expense',
          category: 'Bills',
          amount: b.amount + ((idx + bIdx) % 3) * 5,
          description: b.desc
        });
      }
    });

    // Health
    monthItems.push({
      date: formatDay(year, month, Math.min(3, maxDay)),
      type: 'Expense',
      category: 'Health',
      amount: 55.0,
      description: 'Monthly Gym Membership'
    });

    // Routine dynamic expenses to fill up to targetCount
    const dynamicCategories = [
      { cat: 'Food', count: 12 },
      { cat: 'Travel', count: 4 },
      { cat: 'Shopping', count: 4 },
      { cat: 'Entertainment', count: 4 },
      { cat: 'Education', count: 2 },
      { cat: 'Health', count: 1 },
      { cat: 'Other', count: 2 }
    ];

    // Distribute remaining slots to hit targetCount exactly
    let currentCount = monthItems.length;
    let dayCursor = 2;

    for (const group of dynamicCategories) {
      const templates = expenseTemplates[group.cat];
      for (let k = 0; k < group.count; k++) {
        if (currentCount >= targetCount) break;

        const tmpl = templates[k % templates.length];
        const day = (dayCursor % maxDay) + 1;
        dayCursor = (dayCursor + 3) % maxDay;

        let amount = tmpl.amount;
        if (!amount) {
          const range = tmpl.max - tmpl.min;
          const variance = ((idx * 7 + k * 13) % 100) / 100;
          amount = parseFloat((tmpl.min + range * variance).toFixed(2));
        }

        monthItems.push({
          date: formatDay(year, month, day),
          type: 'Expense',
          category: group.cat,
          amount,
          description: tmpl.desc
        });
        currentCount++;
      }
      if (currentCount >= targetCount) break;
    }

    // If still short by 1 or 2 due to rounding, add Food or Travel
    while (monthItems.length < targetCount) {
      const day = ((monthItems.length * 5) % maxDay) + 1;
      monthItems.push({
        date: formatDay(year, month, day),
        type: 'Expense',
        category: 'Food',
        amount: 28.50 + (monthItems.length % 15),
        description: 'Supermarket Groceries & Snacks'
      });
    }

    // Add all for this month into master list
    monthItems.forEach(item => {
      idCounter++;
      transactions.push({
        id: `tx_${idCounter}`,
        date: item.date,
        type: item.type,
        category: item.category,
        amount: Number(item.amount.toFixed(2)),
        description: item.description
      });
    });
  });

  // Sort descending by date
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return transactions;
}

/**
 * Checks if CSV storage is empty; if so, populates 220 sample transactions.
 */
export function seedIfEmpty() {
  const existing = getAllTransactions();
  if (existing.length === 0) {
    const seed = generateSeedTransactions();
    saveAllTransactions(seed);
    console.log(`[Seed] Seeded ${seed.length} demonstration transactions into CSV storage.`);
    return seed.length;
  }
  console.log(`[Seed] CSV storage already contains ${existing.length} transactions.`);
  return existing.length;
}
