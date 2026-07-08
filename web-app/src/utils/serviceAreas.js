/** 服務區域：先選縣市，再選區／鄉／鎮 */
export const KAOHSIUNG_SERVICE_AREAS = [
  { value: 'zuoying', label: '左營', routeOrder: 0, region: 'kaohsiung' },
  { value: 'gushan', label: '鼓山', routeOrder: 1, region: 'kaohsiung' },
  { value: 'sanmin', label: '三民', routeOrder: 2, region: 'kaohsiung' },
  { value: 'nanzi', label: '楠梓', routeOrder: 3, region: 'kaohsiung' },
  { value: 'xinxing', label: '新興', routeOrder: 4, region: 'kaohsiung' },
  { value: 'qianjin', label: '前金', routeOrder: 5, region: 'kaohsiung' },
  { value: 'yancheng', label: '鹽埕', routeOrder: 6, region: 'kaohsiung' },
  { value: 'lingya', label: '苓雅', routeOrder: 7, region: 'kaohsiung' },
  { value: 'qianzhen', label: '前鎮', routeOrder: 8, region: 'kaohsiung' },
  { value: 'xiaogang', label: '小港', routeOrder: 9, region: 'kaohsiung' },
  { value: 'niaosong', label: '鳥松', routeOrder: 10, region: 'kaohsiung' },
  { value: 'renwu', label: '仁武', routeOrder: 11, region: 'kaohsiung' },
  { value: 'dashe', label: '大社', routeOrder: 12, region: 'kaohsiung' },
  { value: 'fengshan', label: '鳳山', routeOrder: 13, region: 'kaohsiung' },
  { value: 'gangshan', label: '岡山', routeOrder: 14, region: 'kaohsiung' },
  { value: 'qiaotou', label: '橋頭', routeOrder: 15, region: 'kaohsiung' },
];

export const PINGTUNG_SERVICE_AREAS = [
  { value: 'pingtung_city', label: '屏東市', routeOrder: 0, region: 'pingtung' },
  { value: 'jiuru', label: '九如', routeOrder: 1, region: 'pingtung' },
  { value: 'ligang', label: '里港', routeOrder: 2, region: 'pingtung' },
  { value: 'gaoshu', label: '高樹', routeOrder: 3, region: 'pingtung' },
  { value: 'yanpu', label: '鹽埔', routeOrder: 4, region: 'pingtung' },
  { value: 'neipu', label: '內埔', routeOrder: 5, region: 'pingtung' },
  { value: 'zhutian', label: '竹田', routeOrder: 6, region: 'pingtung' },
  { value: 'changzhi', label: '長治', routeOrder: 7, region: 'pingtung' },
  { value: 'linluo', label: '麟洛', routeOrder: 8, region: 'pingtung' },
  { value: 'wandan', label: '萬丹', routeOrder: 9, region: 'pingtung' },
  { value: 'chaozhou', label: '潮州', routeOrder: 10, region: 'pingtung' },
  { value: 'donggang', label: '東港', routeOrder: 11, region: 'pingtung' },
  { value: 'fangliao', label: '枋寮', routeOrder: 12, region: 'pingtung' },
  { value: 'checheng', label: '車城', routeOrder: 13, region: 'pingtung' },
  { value: 'hengchun', label: '恆春', routeOrder: 14, region: 'pingtung' },
];

export const TAINAN_SERVICE_AREAS = [
  { value: 'tainan_westcentral', label: '中西區', routeOrder: 0, region: 'tainan' },
  { value: 'tainan_north', label: '北區', routeOrder: 1, region: 'tainan' },
  { value: 'tainan_east', label: '東區', routeOrder: 2, region: 'tainan' },
  { value: 'tainan_south', label: '南區', routeOrder: 3, region: 'tainan' },
  { value: 'anping', label: '安平', routeOrder: 4, region: 'tainan' },
  { value: 'annan', label: '安南', routeOrder: 5, region: 'tainan' },
  { value: 'yongkang', label: '永康', routeOrder: 6, region: 'tainan' },
  { value: 'rende', label: '仁德', routeOrder: 7, region: 'tainan' },
  { value: 'guiren', label: '歸仁', routeOrder: 8, region: 'tainan' },
  { value: 'xinhua', label: '新化', routeOrder: 9, region: 'tainan' },
  { value: 'shanhua', label: '善化', routeOrder: 10, region: 'tainan' },
  { value: 'xinshi', label: '新市', routeOrder: 11, region: 'tainan' },
  { value: 'anding', label: '安定', routeOrder: 12, region: 'tainan' },
  { value: 'madou', label: '麻豆', routeOrder: 13, region: 'tainan' },
  { value: 'xinying', label: '新營', routeOrder: 14, region: 'tainan' },
  { value: 'yanshui', label: '鹽水', routeOrder: 15, region: 'tainan' },
];

export const SERVICE_AREA_REGIONS = [
  { key: 'kaohsiung', label: '高雄', areas: KAOHSIUNG_SERVICE_AREAS },
  { key: 'pingtung', label: '屏東', areas: PINGTUNG_SERVICE_AREAS },
  { key: 'tainan', label: '台南', areas: TAINAN_SERVICE_AREAS },
];

export const ALL_SERVICE_AREAS = SERVICE_AREA_REGIONS.flatMap((region) => region.areas);

export function sortAreasByRoute(areas = ALL_SERVICE_AREAS) {
  return [...areas].sort((left, right) => (left.routeOrder ?? 99) - (right.routeOrder ?? 99));
}

export function getServiceAreaLabel(value) {
  return ALL_SERVICE_AREAS.find((area) => area.value === value)?.label ?? '未設定';
}

export function getServiceAreaRegion(value) {
  return ALL_SERVICE_AREAS.find((area) => area.value === value)?.region ?? null;
}

export function getRegionByKey(key) {
  return SERVICE_AREA_REGIONS.find((region) => region.key === key) ?? null;
}

export function findRegionKeyForValues(values = []) {
  const first = values.find(Boolean);

  if (!first) {
    return null;
  }

  return getServiceAreaRegion(first);
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
