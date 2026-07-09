import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { formatDateOnly } from '../utils/scheduleCalendar';
import './date-picker.css';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEK_STARTS_ON = 1;

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return startOfDay(value);
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const parsed = parseISO(text.includes('T') ? text : `${text}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function formatDisplayValue(value) {
  const date = parseDateValue(value);

  if (!date) {
    return '';
  }

  return format(date, 'yyyy/MM/dd');
}

export function DatePicker({
  value = '',
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
}) {
  const rootRef = useRef(null);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const minDate = useMemo(() => parseDateValue(min), [min]);
  const maxDate = useMemo(() => parseDateValue(max), [max]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate || today));

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const monthStart = visibleMonth;
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function isDisabledDay(day) {
    if (minDate && isBefore(day, minDate)) {
      return true;
    }

    if (maxDate && isBefore(maxDate, day)) {
      return true;
    }

    return false;
  }

  function emitChange(nextValue) {
    onChange?.({
      target: {
        value: nextValue,
        name,
      },
    });
  }

  function handleSelect(day) {
    if (isDisabledDay(day)) {
      return;
    }

    emitChange(formatDateOnly(day));
    setOpen(false);
  }

  function handleClear(event) {
    event.preventDefault();
    event.stopPropagation();
    emitChange('');
    setOpen(false);
  }

  function handleToday(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isDisabledDay(today)) {
      return;
    }

    emitChange(formatDateOnly(today));
    setVisibleMonth(startOfMonth(today));
    setOpen(false);
  }

  return (
    <div className={`date-picker ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="field-control date-picker__trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className={selectedDate ? 'date-picker__value' : 'date-picker__placeholder'}>
          {selectedDate ? formatDisplayValue(selectedDate) : '選擇日期'}
        </span>
        <span className="date-picker__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {required && (
        <input
          type="text"
          className="date-picker__native-required"
          value={value || ''}
          required
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => {}}
        />
      )}

      {open && (
        <div className="date-picker__popover" role="dialog" aria-label="選擇日期">
          <div className="date-picker__header">
            <button
              type="button"
              className="date-picker__nav"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              aria-label="上一個月"
            >
              ‹
            </button>
            <p className="date-picker__title">
              {format(visibleMonth, 'yyyy年MM月', { locale: zhTW })}
            </p>
            <button
              type="button"
              className="date-picker__nav"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              aria-label="下一個月"
            >
              ›
            </button>
          </div>

          <div className="date-picker__weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="date-picker__weekday">{label}</span>
            ))}
          </div>

          <div className="date-picker__grid">
            {days.map((day) => {
              const key = formatDateOnly(day);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isToday = isSameDay(day, today);
              const outside = !isSameMonth(day, visibleMonth);
              const dayDisabled = isDisabledDay(day);

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    'date-picker__day',
                    selected ? ' is-selected' : '',
                    isToday ? ' is-today' : '',
                    outside ? ' is-outside' : '',
                    dayDisabled ? ' is-disabled' : '',
                  ].join('')}
                  disabled={dayDisabled}
                  onClick={() => handleSelect(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-picker__footer">
            <button type="button" className="date-picker__footer-btn" onClick={handleClear}>
              清除
            </button>
            <button type="button" className="date-picker__footer-btn" onClick={handleToday}>
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
