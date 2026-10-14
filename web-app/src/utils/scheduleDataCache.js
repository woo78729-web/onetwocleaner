import { formatDateOnly } from './scheduleCalendar';

const BOARD_CACHE_KEY = 'ac_schedule_board';
const BOARD_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const emptyCache = {
  schedules: [],
  leaves: [],
  employees: [],
  schedulesAt: 0,
  leavesAt: 0,
  employeesAt: 0,
};

let cache = { ...emptyCache };
let persistTimer = 0;
let boardClosed = false;

function readStoredBoard() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(BOARD_CACHE_KEY) || 'null');

    if (!parsed || Date.now() - Number(parsed.at || 0) > BOARD_CACHE_TTL_MS) {
      localStorage.removeItem(BOARD_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

const storedBoard = readStoredBoard();

if (storedBoard) {
  const storedAt = Number(storedBoard.at) || 0;
  cache = {
    schedules: Array.isArray(storedBoard.schedules) ? storedBoard.schedules : [],
    leaves: Array.isArray(storedBoard.leaves) ? storedBoard.leaves : [],
    employees: Array.isArray(storedBoard.employees) ? storedBoard.employees : [],
    schedulesAt: storedAt,
    leavesAt: storedAt,
    employeesAt: storedAt,
  };
}

function persistBoard() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify({
      at: Date.now(),
      schedules: cache.schedules,
      leaves: cache.leaves,
      employees: cache.employees,
    }));
  } catch {
    // Ignore quota and private-mode failures. The in-memory board still works.
  }
}

function clearStoredBoard() {
  cache = { ...emptyCache };
  boardClosed = true;
  window.clearTimeout(persistTimer);
  persistTimer = 0;

  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(BOARD_CACHE_KEY);
  } catch {
    // Ignore private-mode storage failures.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('ac:logout', clearStoredBoard);
  window.addEventListener('ac:login', () => {
    boardClosed = false;
  });
}

function schedulePersist() {
  if (typeof window === 'undefined') {
    return;
  }

  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = 0;
    persistBoard();
  }, 300);
}

export function readScheduleCache() {
  return cache;
}

export function scheduleCacheHasBoard() {
  return cache.schedulesAt > 0 || cache.leavesAt > 0;
}

export function schedulesOnDate(schedules, dateKey) {
  return (schedules || []).filter((schedule) => formatDateOnly(schedule.work_date) === dateKey);
}

export function commitScheduleCache(startedAt, partial) {
  if (boardClosed) {
    return cache;
  }

  const next = { ...cache };

  if (partial.schedules && startedAt >= cache.schedulesAt) {
    next.schedules = partial.schedules;
    next.schedulesAt = startedAt;
  }

  if (partial.leaves && startedAt >= cache.leavesAt) {
    next.leaves = partial.leaves;
    next.leavesAt = startedAt;
  }

  if (partial.employees && startedAt >= cache.employeesAt) {
    next.employees = partial.employees;
    next.employeesAt = startedAt;
  }

  cache = next;
  schedulePersist();

  return cache;
}

export function scheduleRangeIsFresh(ranges, dateFrom, dateTo, maxAgeMs = 120000) {
  const now = Date.now();

  return ranges.some((range) => (
    range.from <= dateFrom
    && range.to >= dateTo
    && now - range.at < maxAgeMs
  ));
}

export function scheduleRangeHasNewer(ranges, dateFrom, dateTo, at) {
  return ranges.some((range) => range.from === dateFrom && range.to === dateTo && range.at > at);
}

export function rememberScheduleRange(ranges, dateFrom, dateTo, at) {
  return [
    ...ranges.filter((range) => range.from !== dateFrom || range.to !== dateTo || range.at > at),
    { from: dateFrom, to: dateTo, at },
  ];
}

export function rangeHasSchedules(schedules, dateFrom, dateTo) {
  return (schedules || []).some((schedule) => {
    const day = formatDateOnly(schedule?.work_date);

    return Boolean(day) && day >= dateFrom && day <= dateTo;
  });
}

export function mergeSchedulesInRange(existing, incoming, dateFrom, dateTo) {
  const kept = (existing || []).filter((schedule) => {
    const day = formatDateOnly(schedule?.work_date);

    return Boolean(day) && (day < dateFrom || day > dateTo);
  });

  return [...kept, ...(incoming || [])];
}

export function mergeLeavesInRange(existing, incoming, dateFrom, dateTo) {
  const kept = (existing || []).filter((leave) => {
    if (leave?.leave_type === 'weekly') {
      return false;
    }

    const day = formatDateOnly(leave?.leave_date);

    return Boolean(day) && (day < dateFrom || day > dateTo);
  });

  return [...kept, ...(incoming || [])];
}

export function mergeSchedulesForDate(startedAt, dateKey, daySchedules, extra = {}) {
  if (startedAt < cache.schedulesAt) {
    commitScheduleCache(startedAt, extra);
    return cache;
  }

  const kept = cache.schedules.filter((schedule) => formatDateOnly(schedule.work_date) !== dateKey);

  return commitScheduleCache(startedAt, {
    ...extra,
    schedules: [...kept, ...daySchedules],
  });
}
