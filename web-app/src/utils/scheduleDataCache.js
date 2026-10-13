import { formatDateOnly } from './scheduleCalendar';

let cache = {
  schedules: [],
  leaves: [],
  employees: [],
  schedulesAt: 0,
  leavesAt: 0,
  employeesAt: 0,
};

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
