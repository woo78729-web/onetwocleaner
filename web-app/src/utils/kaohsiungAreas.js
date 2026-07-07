/** 以左營為中心，路線由近到遠（排單參考） */
export const KAOHSIUNG_SERVICE_AREAS = [
  { value: 'zuoying', label: '左營', routeOrder: 0 },
  { value: 'gushan', label: '鼓山', routeOrder: 1 },
  { value: 'sanmin', label: '三民', routeOrder: 2 },
  { value: 'nanzi', label: '楠梓', routeOrder: 3 },
  { value: 'xinxing', label: '新興', routeOrder: 4 },
  { value: 'qianjin', label: '前金', routeOrder: 5 },
  { value: 'yancheng', label: '鹽埕', routeOrder: 6 },
  { value: 'lingya', label: '苓雅', routeOrder: 7 },
  { value: 'qianzhen', label: '前鎮', routeOrder: 8 },
  { value: 'xiaogang', label: '小港', routeOrder: 9 },
  { value: 'niaosong', label: '鳥松', routeOrder: 10 },
  { value: 'renwu', label: '仁武', routeOrder: 11 },
  { value: 'dashe', label: '大社', routeOrder: 12 },
  { value: 'fengshan', label: '鳳山', routeOrder: 13 },
  { value: 'gangshan', label: '岡山', routeOrder: 14 },
  { value: 'qiaotou', label: '橋頭', routeOrder: 15 },
];

export function sortAreasByRoute(areas = KAOHSIUNG_SERVICE_AREAS) {
  return [...areas].sort((left, right) => (left.routeOrder ?? 99) - (right.routeOrder ?? 99));
}

export function getServiceAreaLabel(value) {
  return KAOHSIUNG_SERVICE_AREAS.find((area) => area.value === value)?.label ?? '未設定';
}

export function buildAreaFilterParam(selectedAreas) {
  if (!selectedAreas?.length) {
    return undefined;
  }

  return selectedAreas.join(',');
}

export const AVAILABILITY_DAY_PRESETS = [7, 14, 21, 28];

const AVAILABILITY_DAYS_STORAGE_KEY = 'schedule-availability-days';

export function loadAvailabilityDays(defaultDays = 14) {
  try {
    const raw = localStorage.getItem(AVAILABILITY_DAYS_STORAGE_KEY);
    const parsed = Number(raw);

    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
      return parsed;
    }
  } catch {
    // ignore
  }

  return defaultDays;
}

export function saveAvailabilityDays(days) {
  localStorage.setItem(AVAILABILITY_DAYS_STORAGE_KEY, String(days));
}
