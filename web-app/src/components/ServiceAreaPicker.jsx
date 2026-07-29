import { useEffect, useMemo, useState } from 'react';
import {
  SERVICE_AREA_REGIONS,
  findRegionKeyForValues,
  sortAreasByRoute,
} from '../utils/taitungAreas';

function normalizeSelectedValues(selectedValues, mode) {
  if (mode === 'single') {
    const value = Array.isArray(selectedValues) ? selectedValues[0] : selectedValues;
    return value ? [value] : [];
  }

  return Array.isArray(selectedValues) ? selectedValues.filter(Boolean) : [];
}

export function ServiceAreaPicker({
  selectedValues = [],
  onChange,
  mode = 'multiple',
  showClear = true,
  clearLabel = '清除',
  className = '',
  gridClassName = 'availability-area-grid',
  tileClassName = 'availability-area-tile',
  autoSelectRegionOnExpand = false,
}) {
  const values = useMemo(
    () => normalizeSelectedValues(selectedValues, mode),
    [mode, selectedValues],
  );

  const [expandedRegion, setExpandedRegion] = useState(() => findRegionKeyForValues(values));

  useEffect(() => {
    if (values.length === 0) {
      return;
    }

    const regionKey = findRegionKeyForValues(values);

    if (regionKey) {
      setExpandedRegion(regionKey);
    }
  }, [values]);

  function toggleRegion(regionKey) {
    const region = SERVICE_AREA_REGIONS.find((item) => item.key === regionKey);
    const willExpand = expandedRegion !== regionKey;

    setExpandedRegion(willExpand ? regionKey : null);

    // 點縣市後若尚未勾選該縣任何區域，自動全選以便立刻顯示空檔
    if (
      mode === 'multiple'
      && autoSelectRegionOnExpand
      && region
      && willExpand
    ) {
      const regionValues = region.areas.map((area) => area.value);
      const hasAnySelected = regionValues.some((value) => values.includes(value));

      if (!hasAnySelected) {
        onChange?.([...new Set([...values, ...regionValues])]);
      }
    }
  }

  function toggleArea(areaValue) {
    if (mode === 'single') {
      onChange?.(areaValue);
      return;
    }

    if (values.includes(areaValue)) {
      onChange?.(values.filter((value) => value !== areaValue));
      return;
    }

    onChange?.([...values, areaValue]);
  }

  function selectAllInExpandedRegion() {
    const region = SERVICE_AREA_REGIONS.find((item) => item.key === expandedRegion);

    if (!region || mode !== 'multiple') {
      return;
    }

    const regionValues = region.areas.map((area) => area.value);
    onChange?.([...new Set([...values, ...regionValues])]);
  }

  function clearExpandedRegion() {
    const region = SERVICE_AREA_REGIONS.find((item) => item.key === expandedRegion);

    if (!region || mode !== 'multiple') {
      return;
    }

    const regionValueSet = new Set(region.areas.map((area) => area.value));
    onChange?.(values.filter((value) => !regionValueSet.has(value)));
  }

  function clearSelection() {
    onChange?.(mode === 'single' ? '' : []);
  }

  const expandedAreas = useMemo(() => {
    const region = SERVICE_AREA_REGIONS.find((item) => item.key === expandedRegion);
    return region ? sortAreasByRoute(region.areas) : [];
  }, [expandedRegion]);

  const expandedRegionLabel = SERVICE_AREA_REGIONS.find((item) => item.key === expandedRegion)?.label;

  return (
    <div className={`service-area-picker ${className}`.trim()}>
      <div className="service-area-picker__regions-row">
        <div className="service-area-picker__regions" role="group" aria-label="服務縣市">
          {SERVICE_AREA_REGIONS.map((region) => {
            const selectedCount = region.areas.filter((area) => values.includes(area.value)).length;

            return (
              <button
                key={region.key}
                type="button"
                className={`service-area-picker__region${expandedRegion === region.key ? ' is-expanded' : ''}${selectedCount > 0 ? ' has-selected' : ''}`}
                aria-expanded={expandedRegion === region.key}
                onClick={() => toggleRegion(region.key)}
              >
                <span>{region.label}</span>
                {selectedCount > 0 && (
                  <span className="service-area-picker__region-count">{selectedCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {showClear && mode === 'multiple' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm service-area-picker__clear"
            onClick={clearSelection}
            disabled={values.length === 0}
          >
            {clearLabel}
          </button>
        )}
      </div>

      {expandedRegion && expandedAreas.length > 0 && (
        <div className="service-area-picker__district-panel">
          <div className="service-area-picker__district-header">
            <p className="service-area-picker__district-title">
              {expandedRegionLabel}區域（請勾選）
            </p>
            {mode === 'multiple' && (
              <div className="service-area-picker__district-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={selectAllInExpandedRegion}
                >
                  全選
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearExpandedRegion}
                >
                  清除此縣
                </button>
              </div>
            )}
          </div>

          <div className={`service-area-picker__districts ${gridClassName}`} role="group" aria-label="區域選擇">
            {expandedAreas.map((area) => {
              const isActive = values.includes(area.value);

              return (
                <button
                  key={area.value}
                  type="button"
                  className={`${tileClassName}${isActive ? ' is-active' : ''}`}
                  aria-pressed={mode === 'multiple' ? isActive : undefined}
                  aria-checked={mode === 'single' ? isActive : undefined}
                  role={mode === 'single' ? 'radio' : undefined}
                  onClick={() => toggleArea(area.value)}
                >
                  {area.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
