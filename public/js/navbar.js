/**
 * Persistent Navigation Bar Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.toLowerCase();

  // Highlight active link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href').toLowerCase();
    const isDashboard = (href === '/' || href === 'index.html' || href === '/index.html') &&
                        (currentPath === '/' || currentPath.endsWith('index.html') || currentPath === '');
    const isTransactions = (href === 'transactions.html' || href === '/transactions.html' || href === '/transactions') &&
                           (currentPath.includes('transaction'));
    const isReport = (href === 'report.html' || href === '/report.html' || href === '/report') &&
                     (currentPath.includes('report'));

    if (isDashboard || isTransactions || isReport) {
      link.classList.remove('text-slate-600', 'hover:text-indigo-600', 'hover:bg-slate-100');
      link.classList.add('bg-indigo-50', 'text-indigo-600', 'font-semibold', 'shadow-sm');
    } else {
      link.classList.add('text-slate-600', 'hover:text-indigo-600', 'hover:bg-slate-100');
      link.classList.remove('bg-indigo-50', 'text-indigo-600', 'font-semibold', 'shadow-sm');
    }
  });

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});
