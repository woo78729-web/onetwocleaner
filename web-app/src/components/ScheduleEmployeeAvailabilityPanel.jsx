import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  AVAILABILITY_DAY_PRESETS,
  buildAreaFilterParam,
  saveAvailabilityDays,
} from '../utils/serviceAreas';
import { formatChineseTimeValue, formatDateOnly, formatScheduleDateLabel } from '../utils/scheduleCalendar';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ServiceAreaPicker } from './ServiceAreaPicker';

function formatJobLine(job) {
  const start = formatChineseTimeValue(job.start_time);
  const end = formatChineseTimeValue(job.end_time);
  const area = job.service_area_label || '未設定';
  const units = job.ac_units ? `${job.ac_units}台` : '';

  return `${start} ${area} ${units} → ${end}`.replace(/\s+/g, ' ').trim();
}

function getEmployeeAvailabilitySummary(employee) {
  if (employee.on_leave) {
    return { label: '休假', variant: 'leave', slot: null };
  }

  const slots = employee.open_slots || [];

  if (slots.length === 0) {
    if ((employee.jobs || []).length > 0) {
      return { label: '已滿', variant: 'busy', slot: null };
    }

    return { label: '全天', variant: 'open', slot: null };
  }

  if (slots.length === 1) {
    return {
      label: slots[0].label || '可排',
      variant: 'open',
      slot: slots[0],
    };
  }

  const periods = new Set(slots.map((slot) => slot.period));

  if (periods.has('full') || (periods.has('morning') && periods.has('afternoon'))) {
    const slot = slots.find((item) => item.period === 'full')
      || slots.find((item) => item.period === 'morning')
      || slots[0];

    return { label: '全天', variant: 'open', slot };
  }

  if (periods.has('morning')) {
    return {
      label: '上半天',
      variant: 'open',
      slot: slots.find((item) => item.period === 'morning') || slots[0],
    };
  }

  if (periods.has('afternoon')) {
    return {
      label: '下半天',
      variant: 'open',
      slot: slots.find((item) => item.period === 'afternoon') || slots[0],
    };
  }

  return { label: '全天', variant: 'open', slot: slots[0] };
}

function buildDefaultOpenSlot() {
  return {
    period: 'full',
    label: '全日可排',
    from: '07:00',
    to: '21:00',
  };
}

function filterDisplayableEmployees(employees) {
  return employees.filter((employee) => getEmployeeAvailabilitySummary(employee).variant !== 'busy');
}

function buildSlotTimeLabel(slot) {
  if (slot.from && slot.to) {
    return `${slot.from}–${slot.to}`;
  }

  return '';
}

function buildSelectionKey(date, employeeId) {
  return `${date}:${employeeId}`;
}

function formatCompactDayLabel(date, weekday) {
  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return `${parsed.getMonth() + 1}/${parsed.getDate()} 週${weekday}`;
}

function AvailabilityMobileDayRow({
  day,
  employees,
  selectedAreas,
  selectedKey,
  onSelect,
  onPickOpenSlot,
}) {
  return (
    <article className="employee-availability-day-row">
      <div className="employee-availability-day-row__date">
        <span className="employee-availability-day-row__label">
          {formatCompactDayLabel(day.date, day.weekday)}
        </span>
      </div>

      <div className="employee-availability-day-row__masters">
        {employees.map((employee) => {
          const summary = getEmployeeAvailabilitySummary(employee);
          const rowKey = buildSelectionKey(day.date, employee.id);
          const isSelected = selectedKey === rowKey;
          const isClickable = summary.variant === 'open';

          const handleClick = () => {
            onSelect(day.date, employee.id);

            if (!isClickable) {
              return;
            }

            onPickOpenSlot({
              date: day.date,
              employeeId: employee.id,
              slot: summary.slot || buildDefaultOpenSlot(),
              areas: selectedAreas,
            });
          };

          return (
            <button
              key={employee.id}
              type="button"
              className={`availability-master-square is-${summary.variant}${isSelected ? ' is-selected' : ''}`}
              onClick={handleClick}
            >
              <span className="availability-master-square__name">{employee.name}</span>
              <span className="availability-master-square__period">{summary.label}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function AvailabilityOverviewCalendar({ date, schedules, leaves, onNavigate }) {
  const currentDate = useMemo(() => new Date(`${date}T12:00:00`), [date]);

  if (!date) {
    return null;
  }

  return (
    <div className="availability-day-calendar">
      <ScheduleCalendar
        schedules={schedules}
        leaves={leaves}
        currentDate={currentDate}
        displayDays={1}
        initialView="day"
        onNavigate={onNavigate}
      />
    </div>
  );
}

function AvailabilityDayBoard({
  day,
  rows,
  selectedAreas,
  selectedKey,
  onSelect,
  onPickOpenSlot,
  overviewDate,
  overviewSchedules,
  leaves,
  onOverviewNavigate,
}) {
  const showCalendar = overviewDate === day.date;

  return (
    <div className="availability-day-board">
      <div className="availability-day-board__list">
        {rows.map((employee) => {
          const rowKey = buildSelectionKey(day.date, employee.id);
          const isSelected = selectedKey === rowKey;
          const openSlots = employee.open_slots || [];
          const jobs = employee.jobs || [];

          return (
            <div
              key={employee.id}
              className={`availability-day-board__row${isSelected ? ' is-selected' : ''}`}
            >
              <button
                type="button"
                className="availability-day-board__name"
                onClick={() => onSelect(day.date, employee.id)}
              >
                {employee.name}
              </button>

              <div className="availability-day-board__status">
                {employee.on_leave && (
                  <span className="availability-day-board__tag is-leave">休假</span>
                )}

                {!employee.on_leave && openSlots.map((slot) => (
                  <button
                    key={`${employee.id}-${slot.period}-${slot.from}`}
                    type="button"
                    className="availability-day-board__slot"
                    onClick={() => {
                      onSelect(day.date, employee.id);
                      onPickOpenSlot({
                        date: day.date,
                        employeeId: employee.id,
                        slot,
                        areas: selectedAreas,
                      });
                    }}
                  >
                    <span>{slot.label}</span>
                    {buildSlotTimeLabel(slot) && (
                      <small>{buildSlotTimeLabel(slot)}</small>
                    )}
                  </button>
                ))}

                {!employee.on_leave && openSlots.length === 0 && jobs.length > 0 && (
                  <span className="availability-day-board__tag is-busy">已滿</span>
                )}

                {!employee.on_leave && openSlots.length === 0 && jobs.length === 0 && (
                  <span className="availability-day-board__tag is-open">全天可排</span>
                )}
              </div>

              <div className="availability-day-board__jobs">
                {jobs.length > 0 ? jobs.map((job) => (
                  <p key={job.id} className="availability-day-board__job">{formatJobLine(job)}</p>
                )) : (
                  <p className="hint availability-day-board__job availability-day-board__job--empty">尚無已排行程</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCalendar && (
        <AvailabilityOverviewCalendar
          date={overviewDate}
          schedules={overviewSchedules}
          leaves={leaves}
          onNavigate={onOverviewNavigate}
        />
      )}
    </div>
  );
}

export function ScheduleEmployeeAvailabilityPanel({
  panelTitle = '區域師傅空檔',
  selectedAreas,
  onSelectedAreasChange,
  lookaheadDays,
  onLookaheadDaysChange,
  selectedEmployeeId = '',
  onPickOpenSlot,
  employees = [],
  allSchedules = [],
  leaves = [],
}) {
  const isDesktop = !useIsMobile(980);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [shownAreasKey, setShownAreasKey] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [overviewDate, setOverviewDate] = useState('');
  const requestRef = useRef(0);
  const areasKey = selectedAreas.join(',');
  const visibleAvailability = shownAreasKey === areasKey ? availability : null;

  const overviewSchedules = useMemo(() => allSchedules.filter((schedule) => {
    if (selectedEmployeeId && String(schedule.user_id ?? schedule.user?.id) !== String(selectedEmployeeId)) {
      return false;
    }

    if (selectedAreas.length && !selectedAreas.includes(schedule.service_area)) {
      return false;
    }

    return true;
  }), [allSchedules, selectedAreas, selectedEmployeeId]);

  const loadAvailability = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!selectedAreas.length) {
      setAvailability(null);
      setShownAreasKey('');
      setError('');
      setSelectedKey('');
      setOverviewDate('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.getPlanningAvailability({
        areas: buildAreaFilterParam(selectedAreas),
        days: lookaheadDays,
        user_id: selectedEmployeeId || undefined,
      });

      if (requestRef.current !== requestId) {
        return;
      }

      setAvailability(result.data);
      setShownAreasKey(selectedAreas.join(','));
    } catch (err) {
      if (requestRef.current !== requestId) {
        return;
      }

      setError(err.message);
      setAvailability(null);
      setShownAreasKey('');
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [selectedAreas, lookaheadDays, selectedEmployeeId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (!visibleAvailability?.days?.length || selectedKey) {
      return;
    }

    const firstDay = visibleAvailability.days.find((day) => filterDisplayableEmployees(day.employees || []).length > 0);

    if (!firstDay) {
      return;
    }

    const firstEmployee = filterDisplayableEmployees(firstDay.employees)[0];

    if (firstEmployee) {
      setSelectedKey(buildSelectionKey(firstDay.date, firstEmployee.id));
      setOverviewDate(firstDay.date);
    }
  }, [visibleAvailability, selectedKey]);

  function handleSelectedAreasChange(nextAreas) {
    setSelectedKey('');
    setOverviewDate('');
    onSelectedAreasChange(nextAreas);
  }

  function handleOverviewNavigate(date) {
    const nextDate = formatDateOnly(date);

    if (nextDate) {
      setOverviewDate(nextDate);
    }
  }

  function handlePresetDays(days) {
    saveAvailabilityDays(days);
    onLookaheadDaysChange(days);
  }

  function handleCustomDays(rawValue) {
    const next = Number(rawValue);

    if (!Number.isFinite(next) || next < 1 || next > 60) {
      return;
    }

    saveAvailabilityDays(next);
    onLookaheadDaysChange(next);
  }

  function handleSelect(date, employeeId) {
    setSelectedKey(buildSelectionKey(date, employeeId));
    setOverviewDate(date);
  }

  function handlePickOpenSlot(payload) {
    setSelectedKey(buildSelectionKey(payload.date, payload.employeeId));
    setOverviewDate(payload.date);
    onPickOpenSlot?.(payload);
  }

  return (
    <section className="area-availability-bar employee-availability-panel">
      <div className="area-availability-bar__header">
        <div>
          <h3 className="area-availability-bar__title">{panelTitle}</h3>
          <p className="hint">
            點一個縣市就只看該縣，再點其他縣市會改過去。同區域前班結束後預設 1 小時後可排；空班顯示全天可排。
          </p>
        </div>
        <div className="area-availability-bar__range">
          <span className="field-label">往後</span>
          <div className="area-availability-bar__presets">
            {AVAILABILITY_DAY_PRESETS.map((days) => (
              <button
                key={days}
                type="button"
                className={`area-availability-preset${lookaheadDays === days ? ' is-active' : ''}`}
                onClick={() => handlePresetDays(days)}
              >
                {days} 天
              </button>
            ))}
          </div>
          <label className="field field-compact area-availability-bar__custom">
            <input
              className="field-control"
              type="number"
              min="1"
              max="60"
              value={lookaheadDays}
              onChange={(event) => handleCustomDays(event.target.value)}
            />
            <span className="field-label">天</span>
          </label>
        </div>
      </div>

      <ServiceAreaPicker
        mode="multiple"
        selectedValues={selectedAreas}
        onChange={handleSelectedAreasChange}
        autoSelectRegionOnExpand
      />

      {!selectedAreas.length && (
        <p className="hint employee-availability-panel__empty">
          請先點一個縣市（高雄／屏東／台南）。點下去就只顯示該縣的班，不會跟其他縣市混在一起。
        </p>
      )}

      {loading && selectedAreas.length > 0 && (
        <p className="hint employee-availability-panel__empty">載入空檔中…</p>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {visibleAvailability?.days?.length > 0 && (
        isDesktop ? (
          <div className="employee-availability-panel__days">
            {visibleAvailability.days.map((day) => {
              const rows = filterDisplayableEmployees(day.employees || []);

              if (rows.length === 0) {
                return null;
              }

              return (
                <article key={day.date} className="employee-availability-day">
                  <header className="employee-availability-day__header">
                    <h4>{formatScheduleDateLabel(day.date)}</h4>
                    <span className="employee-availability-day__weekday">週{day.weekday}</span>
                  </header>

                  <AvailabilityDayBoard
                    day={day}
                    rows={rows}
                    selectedAreas={selectedAreas}
                    selectedKey={selectedKey}
                    onSelect={handleSelect}
                    onPickOpenSlot={handlePickOpenSlot}
                    overviewDate={overviewDate}
                    overviewSchedules={overviewSchedules}
                    leaves={leaves}
                    onOverviewNavigate={handleOverviewNavigate}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <>
            <div className="employee-availability-panel__days employee-availability-panel__days--mobile-list">
              {visibleAvailability.days.map((day) => {
                const visibleEmployees = filterDisplayableEmployees(day.employees || []);

                if (visibleEmployees.length === 0) {
                  return null;
                }

                return (
                  <AvailabilityMobileDayRow
                    key={day.date}
                    day={day}
                    employees={visibleEmployees}
                    selectedAreas={selectedAreas}
                    selectedKey={selectedKey}
                    onSelect={handleSelect}
                    onPickOpenSlot={handlePickOpenSlot}
                  />
                );
              })}
            </div>

            {overviewDate && (
              <AvailabilityOverviewCalendar
                date={overviewDate}
                schedules={overviewSchedules}
                leaves={leaves}
                onNavigate={handleOverviewNavigate}
              />
            )}
          </>
        )
      )}
    </section>
  );
}
