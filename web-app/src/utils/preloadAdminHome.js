import { hasStoredAuthToken } from '../api/client';

const ROLE_KEY = 'ac_last_role';
const ADMIN_HOME_ROLES = new Set(['admin', 'customer_service']);

export function rememberLastRole(role) {
  if (!role || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function forgetLastRole() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ROLE_KEY);
  } catch {
    // Ignore private-mode storage failures.
  }
}

function readLastRole() {
  if (typeof localStorage === 'undefined') {
    return '';
  }

  try {
    return localStorage.getItem(ROLE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Start the dispatch-board chunks while login is still being confirmed.
 * The route otherwise waits until /api/me returns, then downloads the calendar.
 */
export function preloadAdminHome() {
  if (typeof window === 'undefined' || !hasStoredAuthToken()) {
    return;
  }

  const path = window.location.pathname;
  const onSchedulePage = path.includes('/admin/schedules');

  if (!onSchedulePage && !ADMIN_HOME_ROLES.has(readLastRole())) {
    return;
  }

  import('../pages/AdminSchedulesPage');
  import('../components/ScheduleCalendar');
}
