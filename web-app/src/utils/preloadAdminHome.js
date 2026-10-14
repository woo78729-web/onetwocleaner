const ROLE_KEY = 'ac_last_role';
const USER_CACHE_KEY = 'ac_user_cache';
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
  forgetCachedUser();

  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ROLE_KEY);
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function rememberCachedUser(user) {
  if (!user?.id || !user?.role || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function readCachedUser() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const user = JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null');

    if (user?.id && user?.role) {
      return user;
    }
  } catch {
    // Fall through to the saved role.
  }

  const role = readLastRole();

  if (!role) {
    return null;
  }

  return { role, name: '' };
}

export function forgetCachedUser() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function readLastRole() {
  if (typeof localStorage === 'undefined') {
    return '';
  }

  try {
    return localStorage.getItem(ROLE_KEY) || '';
  } catch {
    return '';
  }
}

export function isAdminHomeRole(role = readLastRole()) {
  return ADMIN_HOME_ROLES.has(role);
}

export function preloadAdminHome() {
  // The dispatch board ships with the first script, so opening it does not
  // wait on a second download. This remains for callers that learn the role.
}
