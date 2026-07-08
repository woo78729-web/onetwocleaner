export {
  AVAILABILITY_DAY_PRESETS,
  ALL_SERVICE_AREAS,
  KAOHSIUNG_SERVICE_AREAS,
  PINGTUNG_SERVICE_AREAS,
  SERVICE_AREA_REGIONS,
  TAINAN_SERVICE_AREAS,
  buildAreaFilterParam,
  findRegionKeyForValues,
  getRegionByKey,
  getServiceAreaLabel,
  getServiceAreaRegion,
  loadAvailabilityDays,
  saveAvailabilityDays,
  sortAreasByRoute,
} from './serviceAreas';

/** @deprecated 請改用 ALL_SERVICE_AREAS */
export { ALL_SERVICE_AREAS as TAITUNG_SERVICE_AREAS } from './serviceAreas';
