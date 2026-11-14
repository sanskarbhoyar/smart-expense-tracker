/**
 * Client API utility and notification helper
 */

// Format numbers as currency ($1,234.56)
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

// Format date string (YYYY-MM-DD -> Nov 14, 2026)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format month string (YYYY-MM -> November 2026)
function formatMonth(monthStr) {
  if (!monthStr || monthStr === 'all') return 'All Time';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const date = new Date(parts[0], parts[1] - 1, 1);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
}

// Format short month string (YYYY-MM -> Nov 2026)
function formatShortMonth(monthStr) {
  if (!monthStr || monthStr === 'all') return 'All';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const date = new Date(parts[0], parts[1] - 1, 1);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short'
  });
}

// Category color mappings
const CATEGORY_COLORS = {
  // Expenses
  Food: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hex: '#10b981' },
  Rent: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', hex: '#f43f5e' },
  Travel: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', hex: '#0284c7' },
  Shopping: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', hex: '#a855f7' },
  Bills: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hex: '#f59e0b' },
  Education: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', hex: '#6366f1' },
  Health: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', hex: '#14b8a6' },
  Entertainment: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', hex: '#ec4899' },
  Other: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', hex: '#6b7280' },

  // Incomes
  Salary: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', hex: '#059669' },
  Freelance: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', hex: '#0891b2' },
  'Pocket Money': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', hex: '#d97706' },
  'Other Income': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', hex: '#2563eb' }
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    hex: '#64748b'
  };
}

// Category icons
function getCategoryIcon(category) {
  const map = {
    Food: 'fa-utensils',
    Rent: 'fa-house-chimney',
    Travel: 'fa-plane-departure',
    Shopping: 'fa-bag-shopping',
    Bills: 'fa-bolt',
    Education: 'fa-graduation-cap',
    Health: 'fa-heart-pulse',
    Entertainment: 'fa-film',
    Other: 'fa-tag',
    Salary: 'fa-money-bill-wave',
    Freelance: 'fa-laptop-code',
    'Pocket Money': 'fa-hand-holding-dollar',
    'Other Income': 'fa-coins'
  };
  return map[category] || 'fa-receipt';
}

// Toast notification helper
function showToast(message, type = 'success', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm transition-all toast-enter';

  let icon = 'fa-check-circle';
  let colors = 'bg-white border-emerald-200 text-slate-800';
  let iconColor = 'text-emerald-500';

  if (type === 'error') {
    icon = 'fa-circle-exclamation';
    colors = 'bg-white border-rose-200 text-slate-800';
    iconColor = 'text-rose-500';
  } else if (type === 'info') {
    icon = 'fa-circle-info';
    colors = 'bg-white border-sky-200 text-slate-800';
    iconColor = 'text-sky-500';
  }

  toast.className += ` ${colors}`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg ${iconColor} mt-0.5 shrink-0"></i>
    <div class="flex-1 font-medium leading-tight">${message}</div>
    <button class="text-slate-400 hover:text-slate-600 ml-2" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Universal fetch wrapper
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || (data.errors && data.errors[0]) || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}
