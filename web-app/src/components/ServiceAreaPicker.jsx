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
    setExpandedRegion((current) => (current === regionKey ? null : regionKey));
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

  function clearSelection() {
    onChange?.(mode === 'single' ? '' : []);
  }

  const expandedAreas = useMemo(() => {
    const region = SERVICE_AREA_REGIONS.find((item) => item.key === expandedRegion);
    return region ? sortAreasByRoute(region.areas) : [];
  }, [expandedRegion]);

  return (
    <div className={`service-area-picker ${className}`.trim()}>
      {showClear && mode === 'multiple' && (
        <div className="service-area-picker__toolbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm service-area-picker__clear"
            onClick={clearSelection}
            disabled={values.length === 0}
          >
            {clearLabel}
          </button>
        </div>
      )}

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

      {expandedRegion && expandedAreas.length > 0 && (
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
      )}
    </div>
  );
}
