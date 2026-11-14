export const VALID_CATEGORIES = {
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

/**
 * Validates transaction input.
 * Returns { valid: boolean, errors: string[], sanitized: object | null }
 */
export function validateTransaction(data) {
  const errors = [];

  // 1. Type validation
  const type = String(data.type || '').trim();
  if (type !== 'Income' && type !== 'Expense') {
    errors.push("Type must be either 'Income' or 'Expense'.");
  }

  // 2. Category validation
  const category = String(data.category || '').trim();
  if (!category) {
    errors.push("Category is required.");
  } else if (type && VALID_CATEGORIES[type] && !VALID_CATEGORIES[type].includes(category)) {
    errors.push(`Invalid category '${category}' for type '${type}'. Allowed: ${VALID_CATEGORIES[type].join(', ')}`);
  }

  // 3. Amount validation
  const rawAmount = data.amount;
  const numAmount = Number(rawAmount);
  if (rawAmount === undefined || rawAmount === null || rawAmount === '' || isNaN(numAmount)) {
    errors.push("Amount must be a valid numeric value.");
  } else if (numAmount <= 0) {
    errors.push("Amount must be greater than zero.");
  }

  // 4. Date validation
  const dateStr = String(data.date || '').trim();
  if (!dateStr) {
    errors.push("Date is required.");
  } else {
    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      errors.push("Date must be in YYYY-MM-DD format.");
    } else {
      const parsedDate = new Date(dateStr + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) {
        errors.push("Date is invalid.");
      } else {
        // Compare with today's date in local time or ISO format
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (dateStr > todayStr) {
          errors.push(`Date cannot be in the future (today is ${todayStr}).`);
        }
      }
    }
  }

  // 5. Description validation (optional, max 100 chars)
  const description = String(data.description || '').trim();
  if (description.length > 100) {
    errors.push("Description cannot exceed 100 characters.");
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      sanitized: null
    };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      type,
      category,
      amount: parseFloat(numAmount.toFixed(2)),
      date: dateStr,
      description
    }
  };
}
