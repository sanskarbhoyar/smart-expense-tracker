/**
 * Transactions Page Logic
 * Handles table rendering, filtering, sorting, pagination, deletion, and CSV export.
 */

let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 15;
let transactionToDelete = null;

document.addEventListener('DOMContentLoaded', () => {
  initTransactionsPage();
  setupEventListeners();
});

/**
 * Initializes transactions list, category and month options.
 */
async function initTransactionsPage() {
  await loadFilterOptions();
  await fetchTransactions();
}

/**
 * Loads available months from analytics endpoint and populates month dropdown.
 */
async function loadFilterOptions() {
  try {
    const res = await apiRequest('/api/analytics');
    if (res.success && res.analytics.availableMonths) {
      const monthSelect = document.getElementById('filter-month');
      if (monthSelect) {
        let html = '<option value="all">All Months</option>';
        res.analytics.availableMonths.forEach(m => {
          html += `<option value="${m}">${formatMonth(m)}</option>`;
        });
        monthSelect.innerHTML = html;
      }
    }
  } catch (err) {
    console.error('Failed to load filter options:', err);
  }
}

/**
 * Fetches transactions from the backend API.
 */
async function fetchTransactions() {
  const tableBody = document.getElementById('transactions-table-body');
  const loadingIndicator = document.getElementById('table-loading');
  const emptyState = document.getElementById('table-empty-state');

  if (loadingIndicator) loadingIndicator.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');

  try {
    const month = document.getElementById('filter-month')?.value || 'all';
    const type = document.getElementById('filter-type')?.value || 'all';
    const category = document.getElementById('filter-category')?.value || 'all';
    const search = document.getElementById('filter-search')?.value || '';

    const params = new URLSearchParams();
    if (month !== 'all') params.append('month', month);
    if (type !== 'all') params.append('type', type);
    if (category !== 'all') params.append('category', category);
    if (search.trim()) params.append('search', search.trim());

    const url = `/api/transactions?${params.toString()}`;
    const res = await apiRequest(url);

    if (res.success) {
      allTransactions = res.transactions;
      filteredTransactions = [...allTransactions];
      currentPage = 1;
      renderTable();
      updateCountBadges();
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
    showToast('Failed to load transactions: ' + err.message, 'error');
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
  }
}

/**
 * Sets up event listeners for filters, search, modal, and export.
 */
function setupEventListeners() {
  // Filter change handlers
  const filterMonth = document.getElementById('filter-month');
  const filterType = document.getElementById('filter-type');
  const filterCategory = document.getElementById('filter-category');
  const filterSearch = document.getElementById('filter-search');
  const resetBtn = document.getElementById('btn-reset-filters');
  const exportBtn = document.getElementById('btn-download-csv');

  if (filterMonth) filterMonth.addEventListener('change', () => fetchTransactions());
  if (filterType) {
    filterType.addEventListener('change', () => {
      updateCategoryFilterOptions(filterType.value);
      fetchTransactions();
    });
  }
  if (filterCategory) filterCategory.addEventListener('change', () => fetchTransactions());

  // Search input debounced
  let debounceTimer;
  if (filterSearch) {
    filterSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchTransactions();
      }, 300);
    });
  }

  // Reset Filters
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (filterMonth) filterMonth.value = 'all';
      if (filterType) filterType.value = 'all';
      if (filterCategory) filterCategory.value = 'all';
      if (filterSearch) filterSearch.value = '';
      updateCategoryFilterOptions('all');
      fetchTransactions();
      showToast('Filters reset to default.', 'info');
    });
  }

  // Download CSV
  if (exportBtn) {
    exportBtn.addEventListener('click', handleDownloadCsv);
  }

  // Delete modal cancel & confirm buttons
  const cancelDeleteBtn = document.getElementById('btn-cancel-delete');
  const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
  const closeDeleteBtn = document.getElementById('btn-close-delete-modal');

  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDeleteModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', executeDelete);

  // Quick Add Modal support
  setupQuickAddModal();
}

/**
 * Updates Category dropdown based on selected Type.
 */
function updateCategoryFilterOptions(type) {
  const catSelect = document.getElementById('filter-category');
  if (!catSelect) return;

  const currentVal = catSelect.value;
  let options = [];

  const EXPENSE_CATS = ['Food', 'Rent', 'Travel', 'Shopping', 'Bills', 'Education', 'Health', 'Entertainment', 'Other'];
  const INCOME_CATS = ['Pocket Money', 'Salary', 'Freelance', 'Other Income'];

  if (type === 'Expense') {
    options = EXPENSE_CATS;
  } else if (type === 'Income') {
    options = INCOME_CATS;
  } else {
    options = [...EXPENSE_CATS, ...INCOME_CATS];
  }

  let html = '<option value="all">All Categories</option>';
  options.forEach(c => {
    html += `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`;
  });
  catSelect.innerHTML = html;
}

/**
 * Renders the transactions table with pagination.
 */
function renderTable() {
  const tableBody = document.getElementById('transactions-table-body');
  const emptyState = document.getElementById('table-empty-state');
  const paginationControls = document.getElementById('pagination-controls');

  if (!tableBody) return;

  if (filteredTransactions.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (paginationControls) paginationControls.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (paginationControls) paginationControls.classList.remove('hidden');

  // Pagination slice
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pageItems = filteredTransactions.slice(startIdx, endIdx);

  tableBody.innerHTML = pageItems.map(t => {
    const isIncome = t.type === 'Income';
    const amountClass = isIncome ? 'text-emerald-600 font-bold' : 'text-slate-900 font-bold';
    const amountPrefix = isIncome ? '+ ' : '- ';
    const typeBadge = isIncome
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
           <i class="fa-solid fa-arrow-down-left text-[10px]"></i> Income
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
           <i class="fa-solid fa-arrow-up-right text-[10px]"></i> Expense
         </span>`;

    const catStyle = getCategoryColor(t.category);
    const catIcon = getCategoryIcon(t.category);

    return `
      <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
        <td class="px-5 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
          ${t.id}
        </td>
        <td class="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
          <div class="flex items-center gap-2">
            <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
            <span>${formatDate(t.date)}</span>
          </div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap">
          ${typeBadge}
        </td>
        <td class="px-5 py-4 whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${catStyle.bg} ${catStyle.text} border ${catStyle.border}">
            <i class="fa-solid ${catIcon} text-[10px]"></i>
            ${t.category}
          </span>
        </td>
        <td class="px-5 py-4 text-sm text-slate-600 max-w-xs truncate">
          ${t.description ? escapeHtml(t.description) : '<span class="text-slate-300 italic">No description</span>'}
        </td>
        <td class="px-5 py-4 whitespace-nowrap text-right text-sm ${amountClass}">
          ${amountPrefix}${formatCurrency(t.amount)}
        </td>
        <td class="px-5 py-4 whitespace-nowrap text-center">
          <button 
            onclick="promptDeleteTransaction('${t.id}', '${escapeHtml(t.category)}', ${t.amount}, '${escapeHtml(t.date)}')"
            class="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Delete transaction">
            <i class="fa-regular fa-trash-can text-sm"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationControls(totalPages, startIdx + 1, endIdx, totalItems);
}

/**
 * Updates summary badges on transactions page.
 */
function updateCountBadges() {
  const countBadge = document.getElementById('transaction-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filteredTransactions.length} records`;
  }

  // Calculate filtered income and expenses
  let income = 0;
  let expense = 0;
  filteredTransactions.forEach(t => {
    if (t.type === 'Income') income += Number(t.amount);
    else expense += Number(t.amount);
  });

  const sumIncome = document.getElementById('summary-filter-income');
  const sumExpense = document.getElementById('summary-filter-expense');
  if (sumIncome) sumIncome.textContent = formatCurrency(income);
  if (sumExpense) sumExpense.textContent = formatCurrency(expense);
}

/**
 * Renders pagination controls.
 */
function renderPaginationControls(totalPages, start, end, total) {
  const infoEl = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');
  const pagesList = document.getElementById('pagination-page-numbers');

  if (infoEl) {
    infoEl.textContent = `Showing ${start} to ${end} of ${total} transactions`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    };
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    };
  }

  if (pagesList) {
    let html = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      const isActive = p === currentPage;
      html += `
        <button 
          onclick="gotoPage(${p})" 
          class="w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
            isActive
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }">
          ${p}
        </button>
      `;
    }
    pagesList.innerHTML = html;
  }
}

function gotoPage(p) {
  currentPage = p;
  renderTable();
}

/**
 * Initiates the delete confirmation dialog.
 */
window.promptDeleteTransaction = function(id, category, amount, date) {
  transactionToDelete = id;
  const modal = document.getElementById('delete-modal');
  const details = document.getElementById('delete-target-details');

  if (details) {
    details.textContent = `${category} (${formatCurrency(amount)}) on ${formatDate(date)}`;
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

function closeDeleteModal() {
  transactionToDelete = null;
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Sends DELETE request to server.
 */
async function executeDelete() {
  if (!transactionToDelete) return;

  const confirmBtn = document.getElementById('btn-confirm-delete');
  const prevText = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
  }

  try {
    const res = await apiRequest(`/api/transactions/${encodeURIComponent(transactionToDelete)}`, {
      method: 'DELETE'
    });

    if (res.success) {
      showToast('Transaction removed successfully.', 'success');
      closeDeleteModal();
      await fetchTransactions();
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast(err.message || 'Failed to delete transaction.', 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = prevText;
    }
  }
}

/**
 * Handles CSV file download with currently applied filters.
 */
function handleDownloadCsv() {
  const month = document.getElementById('filter-month')?.value || 'all';
  const type = document.getElementById('filter-type')?.value || 'all';
  const category = document.getElementById('filter-category')?.value || 'all';
  const search = document.getElementById('filter-search')?.value || '';

  const params = new URLSearchParams();
  if (month !== 'all') params.append('month', month);
  if (type !== 'all') params.append('type', type);
  if (category !== 'all') params.append('category', category);
  if (search.trim()) params.append('search', search.trim());

  const downloadUrl = `/api/export/csv?${params.toString()}`;

  // Direct download link trigger
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('Downloading CSV export...', 'info');
}

/**
 * Optional Quick Add Modal on Transactions page.
 */
function setupQuickAddModal() {
  const openModalBtn = document.getElementById('btn-open-add-modal');
  const closeModalBtn = document.getElementById('btn-close-add-modal');
  const modal = document.getElementById('add-tx-modal');
  const form = document.getElementById('quick-add-form');

  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => {
      // Initialize date
      const dateInp = document.getElementById('modal-tx-date');
      const today = new Date().toISOString().split('T')[0];
      if (dateInp) {
        dateInp.value = today;
        dateInp.max = today;
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  // Type toggle in modal
  const typeRadios = document.querySelectorAll('input[name="modal-tx-type"]');
  typeRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      updateModalCategoryOptions(e.target.value);
    });
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.querySelector('input[name="modal-tx-type"]:checked')?.value || 'Expense';
      const date = document.getElementById('modal-tx-date').value.trim();
      const category = document.getElementById('modal-tx-category').value.trim();
      const amount = parseFloat(document.getElementById('modal-tx-amount').value.trim());
      const description = document.getElementById('modal-tx-description').value.trim();

      if (!amount || isNaN(amount) || amount <= 0) {
        showToast('Please enter an amount > $0.00', 'error');
        return;
      }

      try {
        await apiRequest('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({ type, date, category, amount, description })
        });

        showToast('Transaction created successfully.', 'success');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
        await fetchTransactions();
      } catch (err) {
        showToast(err.message || 'Failed to create transaction', 'error');
      }
    });
  }
}

function updateModalCategoryOptions(type) {
  const select = document.getElementById('modal-tx-category');
  if (!select) return;

  const EXPENSE_CATS = ['Food', 'Rent', 'Travel', 'Shopping', 'Bills', 'Education', 'Health', 'Entertainment', 'Other'];
  const INCOME_CATS = ['Pocket Money', 'Salary', 'Freelance', 'Other Income'];
  const list = type === 'Income' ? INCOME_CATS : EXPENSE_CATS;

  select.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
