import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { Layout } from '../components/Layout';
import { CalendarMiniMonth } from '../components/CalendarMiniMonth';
import { CalendarSettingsPanel } from '../components/CalendarSettingsPanel';
import { ScheduleEmployeeAvailabilityPanel } from '../components/ScheduleEmployeeAvailabilityPanel';
import { ScheduleAreaFilter } from '../components/ScheduleAreaFilter';
import { ServiceAreaPicker } from '../components/ServiceAreaPicker';
import { PageAlert } from '../components/PageAlert';
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import { useIsMobile } from '../hooks/useIsMobile';
import { api, hasStoredAuthToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canAccess, canManageSchedulePricing } from '../utils/permissions';
import { loadCalendarSettings, saveCalendarSettings } from '../utils/calendarSettings';
import { isAbortError, loadWithRetry, useRefreshOnVisible } from '../utils/pageLoad';
import {
  commitScheduleCache,
  mergeLeavesInRange,
  mergeSchedulesInRange,
  readScheduleCache,
  rememberScheduleRange,
  rangeHasSchedules,
  scheduleRangeHasNewer,
  scheduleRangeIsFresh,
} from '../utils/scheduleDataCache';
import { loadAvailabilityDays } from '../utils/serviceAreas';
import {
  buildSchedulePayload,
  buildSchedulePayloads,
  buildScheduleSuccessSummary,
  scheduleHasMailTrackingItem,
  buildScheduleTimePatch,
  calendarInteractionToScheduleUpdate,
  canDragScheduleEvent,
  canEditSchedule,
  canDeleteSchedule,
  canMutateScheduleWorkDate,
  CUSTOMER_SOURCE_OPTIONS,
  emptyScheduleForm,
  formatDateOnly,
  formatTimeValue,
  getAdminCalendarFetchRange,
  getAvailabilityLoadRange,
  getCalendarLoadRange,
  getVisibleScheduleRange,
  hasScheduleReport,
  isSlotInPast,
  scheduleToForm,
  slotToForm,
  applyPriceCalculation,
} from '../utils/scheduleCalendar';
import '../components/schedule-calendar.css';

const scheduleCalendarPromise = import('../components/ScheduleCalendar');
const scheduleFormModalPromise = import('../components/ScheduleFormModal');
const scheduleSnapshotModalPromise = import('../components/ScheduleSnapshotModal');
const scheduleSuccessModalPromise = import('../components/ScheduleSuccessModal');

function lazyNamed(promise, name) {
  return lazy(() => promise.then((module) => ({ default: module[name] })));
}

const ScheduleCalendar = lazyNamed(scheduleCalendarPromise, 'ScheduleCalendar');
const ScheduleFormModal = lazyNamed(scheduleFormModalPromise, 'ScheduleFormModal');
const ScheduleSnapshotModal = lazyNamed(scheduleSnapshotModalPromise, 'ScheduleSnapshotModal');
const ScheduleSuccessModal = lazyNamed(scheduleSuccessModalPromise, 'ScheduleSuccessModal');

function getInitialDisplayDays(settings) {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
    return 1;
  }

  return Math.min(7, Math.max(1, settings.displayDays || 7));
}

let visibleBoardPrime = null;

function rangesMatch(left, right) {
  return left?.date_from === right?.date_from && left?.date_to === right?.date_to;
}

async function fetchBoardRange(range) {
  const [result, leaveResult] = await loadWithRetry(async () => Promise.all([
    api.getCalendarSchedules(range),
    api.getPlanningLeaves(range),
  ]));

  return {
    schedules: result.data?.schedules || [],
    leaves: leaveResult.data?.leaves || [],
  };
}

function primeVisibleBoard(anchor = new Date(), displayDays = 7) {
  const range = getVisibleScheduleRange(anchor, displayDays);
  const key = `${range.date_from}|${range.date_to}`;

  if (visibleBoardPrime?.key === key && Date.now() - visibleBoardPrime.at < 15000) {
    return visibleBoardPrime;
  }

  const at = Date.now();
  const promise = fetchBoardRange(range).catch((error) => {
    if (visibleBoardPrime?.key === key && visibleBoardPrime.at === at) {
      visibleBoardPrime = null;
    }

    throw error;
  });
  visibleBoardPrime = { key, at, range, promise };

  return visibleBoardPrime;
}

if (typeof window !== 'undefined' && hasStoredAuthToken()) {
  primeVisibleBoard(new Date(), getInitialDisplayDays(loadCalendarSettings()));
}

export default function AdminSchedulesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userRole = user?.role || 'admin';
  const isMobile = useIsMobile();
  const isDesktop = !useIsMobile(980);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState(() => readScheduleCache().employees);
  const [allSchedules, setAllSchedules] = useState(() => readScheduleCache().schedules);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [form, setForm] = useState(emptyScheduleForm);
  const [editId, setEditId] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [calendarSettings, setCalendarSettings] = useState(() => loadCalendarSettings());
  const [displayDays, setDisplayDays] = useState(() => {
    const settings = loadCalendarSettings();
    return getInitialDisplayDays(settings);
  });
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [lookaheadDays, setLookaheadDays] = useState(() => loadAvailabilityDays(14));
  const [leaves, setLeaves] = useState(() => readScheduleCache().leaves);
  const [snapshotSchedule, setSnapshotSchedule] = useState(null);
  const [successSummary, setSuccessSummary] = useState(null);
  const [pendingMailRedirect, setPendingMailRedirect] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const scheduleRequestRef = useRef(0);
  const loadedRangesRef = useRef([]);
  const schedulesRef = useRef(allSchedules);
  const leavesRef = useRef(leaves);

  const schedules = useMemo(() => {
    let next = allSchedules;

    if (selectedEmployeeId) {
      next = next.filter((schedule) => String(schedule.user_id) === String(selectedEmployeeId));
    }

    if (!selectedAreas.length) {
      return next;
    }

    return next.filter((schedule) => selectedAreas.includes(schedule.service_area));
  }, [allSchedules, selectedAreas, selectedEmployeeId]);

  const loadEmployees = useCallback(async () => {
    const startedAt = Date.now();
    const result = await api.getEmployees();
    const nextEmployees = result.data.filter((item) => item.role === 'employee' && item.is_active);
    setEmployees(nextEmployees);
    commitScheduleCache(startedAt, { employees: nextEmployees });
  }, []);

  const loadSchedules = useCallback(async (
    anchor = currentDate,
    days = lookaheadDays,
    visibleDayCount = displayDays,
    { force = false, keepExistingOnEmpty = false } = {},
  ) => {
    const visibleRange = getVisibleScheduleRange(anchor, visibleDayCount);
    const fetchRange = getAdminCalendarFetchRange(anchor, visibleDayCount);
    const availabilityRange = getAvailabilityLoadRange(days, anchor);
    const date_from = fetchRange.date_from < availabilityRange.date_from
      ? fetchRange.date_from
      : availabilityRange.date_from;
    const date_to = fetchRange.date_to > availabilityRange.date_to
      ? fetchRange.date_to
      : availabilityRange.date_to;
    const wideRange = { date_from, date_to };

    if (!force && scheduleRangeIsFresh(loadedRangesRef.current, date_from, date_to)) {
      return;
    }

    if (force) {
      visibleBoardPrime = null;
    }

    const requestId = scheduleRequestRef.current + 1;
    const startedAt = Date.now();
    scheduleRequestRef.current = requestId;
    setError('');

    const applyBoard = (payload, scheduleRange, leaveRange, defer) => {
      if (scheduleRequestRef.current !== requestId) {
        return false;
      }

      if (scheduleRangeHasNewer(loadedRangesRef.current, scheduleRange.date_from, scheduleRange.date_to, startedAt)) {
        return false;
      }

      if (
        keepExistingOnEmpty
        && payload.schedules.length === 0
        && rangeHasSchedules(schedulesRef.current, scheduleRange.date_from, scheduleRange.date_to)
      ) {
        return false;
      }

      const write = () => {
        loadedRangesRef.current = rememberScheduleRange(
          loadedRangesRef.current,
          scheduleRange.date_from,
          scheduleRange.date_to,
          startedAt,
        );
        setAllSchedules((previous) => {
          const schedules = mergeSchedulesInRange(
            previous,
            payload.schedules,
            scheduleRange.date_from,
            scheduleRange.date_to,
          );
          schedulesRef.current = schedules;
          commitScheduleCache(startedAt, { schedules, leaves: leavesRef.current });
          return schedules;
        });
        setLeaves((previous) => {
          const nextLeaves = mergeLeavesInRange(
            previous,
            payload.leaves,
            leaveRange.date_from,
            leaveRange.date_to,
          );
          leavesRef.current = nextLeaves;
          commitScheduleCache(startedAt, { schedules: schedulesRef.current, leaves: nextLeaves });
          return nextLeaves;
        });
      };

      if (defer) {
        startTransition(write);
      } else {
        write();
      }

      return true;
    };

    const visibleAlreadyLoaded = !force && scheduleRangeIsFresh(
      loadedRangesRef.current,
      visibleRange.date_from,
      visibleRange.date_to,
    );
    let visibleReady = visibleAlreadyLoaded || schedulesRef.current.length > 0;

    if (!visibleAlreadyLoaded) {
      try {
        const primed = !force && rangesMatch(visibleBoardPrime?.range, visibleRange)
          ? visibleBoardPrime
          : null;
        const payload = primed
          ? await primed.promise
          : await fetchBoardRange(visibleRange);

        if (scheduleRequestRef.current !== requestId) {
          return;
        }

        visibleReady = applyBoard(payload, visibleRange, visibleRange, false) || visibleReady;
      } catch (err) {
        if (scheduleRequestRef.current !== requestId || isAbortError(err)) {
          return;
        }

        if (!visibleReady) {
          setError(err.message);
        }
      }
    }

    if (rangesMatch(visibleRange, wideRange)) {
      return;
    }

    try {
      const payload = await fetchBoardRange(wideRange);

      if (scheduleRequestRef.current !== requestId) {
        return;
      }

      applyBoard(payload, wideRange, wideRange, true);
      setError('');
    } catch (err) {
      if (scheduleRequestRef.current !== requestId || isAbortError(err) || visibleReady) {
        return;
      }

      setError(err.message);
    }
  }, [currentDate, lookaheadDays, displayDays]);

  useEffect(() => {
    import('./AdminScheduleDayPage');
  }, []);

  useEffect(() => {
    loadEmployees().catch((err) => setError(err.message));
  }, [loadEmployees]);

  useEffect(() => {
    const delay = loadedRangesRef.current.length ? 200 : 0;
    const timer = window.setTimeout(() => {
      loadSchedules(currentDate, lookaheadDays, displayDays).catch((err) => setError(err.message));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [currentDate, lookaheadDays, displayDays, loadSchedules]);

  useRefreshOnVisible(() => {
    loadSchedules(currentDate, lookaheadDays, displayDays, {
      force: true,
      keepExistingOnEmpty: true,
    }).catch((err) => setError(err.message));
  });

  useEffect(() => {
    if (!isMobile) {
      return undefined;
    }

    const sheetOpen = mobileFilterOpen;
    document.body.classList.toggle('schedule-mobile-sheet-open', sheetOpen);

    return () => {
      document.body.classList.remove('schedule-mobile-sheet-open');
    };
  }, [isMobile, mobileFilterOpen]);

  const openCreate = useCallback((slot) => {
    if (isSlotInPast(slot, { userRole })) {
      setError('不可預約過去的日期或時間，請選擇現在之後的時段');
      return;
    }
    try {
      setEditId(null);
      setEditingSchedule(null);
      setForm({
        ...slotToForm(slot, { schedules: allSchedules, userId: selectedEmployeeId, userRole }),
        user_id: selectedEmployeeId || '',
      });
      setModalOpen(true);
      setMessage('');
      setError('');
    } catch (err) {
      setError(err?.message || '無法開啟派班表單');
    }
  }, [allSchedules, selectedEmployeeId, userRole]);

  const openSnapshot = useCallback((schedule) => {
    if (schedule?.type === 'leave') {
      return;
    }
    setSnapshotSchedule(schedule);
    setMessage('');
    setError('');
  }, []);

  function closeSnapshot() {
    setSnapshotSchedule(null);
  }

  function openEditFromSnapshot(schedule) {
    closeSnapshot();
    openEdit(schedule);
  }

  function openEdit(schedule) {
    if (!canEditSchedule(schedule, userRole)) {
      setError(hasScheduleReport(schedule) ? '此班表已有回報紀錄，無法編輯' : '無法編輯此班表');
      return;
    }
    const monthError = canMutateScheduleWorkDate(formatDateOnly(schedule.work_date), { userRole });
    if (monthError) {
      setError(monthError);
      return;
    }
    setEditId(schedule.id);
    setEditingSchedule(schedule);
    setForm(scheduleToForm(schedule));
    setModalOpen(true);
    setMessage('');
    setError('');
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setEditingSchedule(null);
    setForm(emptyScheduleForm);
  }

  function getFormEmployees() {
    if (!editingSchedule?.user) {
      return employees;
    }
    const assignedId = String(editingSchedule.user.id);
    if (employees.some((employee) => String(employee.id) === assignedId)) {
      return employees;
    }
    return [editingSchedule.user, ...employees];
  }

  function patchScheduleTimes(scheduleId, fields) {
    setAllSchedules((previous) => {
      const next = previous.map((item) => (
        item.id === scheduleId ? { ...item, ...fields } : item
      ));
      schedulesRef.current = next;
      return next;
    });
  }

  const persistScheduleTimeChange = useCallback((schedule, start, end, calendarEvent = null) => {
    const previous = {
      work_date: formatDateOnly(schedule.work_date),
      start_time: formatTimeValue(schedule.start_time),
      end_time: formatTimeValue(schedule.end_time),
    };
    let payload;
    try {
      const fields = calendarInteractionToScheduleUpdate(schedule, start, end, {
        eventStart: calendarEvent?.start,
        eventEnd: calendarEvent?.end,
      });
      payload = buildScheduleTimePatch(
        { ...scheduleToForm(schedule), ...fields },
        { original: schedule, userRole },
      );
    } catch (err) {
      setError(err.message);
      return false;
    }
    flushSync(() => {
      patchScheduleTimes(schedule.id, payload);
    });
    setMessage('');
    api.updateSchedule(schedule.id, payload)
      .then((response) => {
        const data = response.data;
        patchScheduleTimes(schedule.id, {
          work_date: formatDateOnly(data.work_date),
          start_time: formatTimeValue(data.start_time),
          end_time: formatTimeValue(data.end_time),
        });
        setMessage('行程時間已更新');
      })
      .catch((err) => {
        patchScheduleTimes(schedule.id, previous);
        setError(err.message);
      });
    return true;
  }, [userRole]);

  const handleEventDrop = useCallback(({ event, start, end }) => (
    persistScheduleTimeChange(event.resource, start, end, event)
  ), [persistScheduleTimeChange]);

  const handleEventResize = useCallback(({ event, start, end }) => (
    persistScheduleTimeChange(event.resource, start, end, event)
  ), [persistScheduleTimeChange]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    let payloads;
    try {
      payloads = editId
        ? [buildSchedulePayload(form, {
          original: editingSchedule,
          userRole,
        })]
        : buildSchedulePayloads(form, { userRole });
    } catch (err) {
      setError(err.message);
      window.alert(err.message);
      return;
    }
    try {
      const summaryPayload = buildScheduleSuccessSummary(form, getFormEmployees(), {
        mode: editId ? 'update' : 'create',
      });
      if (editId) {
        await api.updateSchedule(editId, payloads[0]);
        closeModal();
        setPendingMailRedirect(false);
      } else {
        for (const item of payloads) {
          await api.createSchedule(item);
        }
        closeModal();
        setPendingMailRedirect(payloads.some((item) => scheduleHasMailTrackingItem(item)));
      }
      setSuccessSummary(summaryPayload);
      loadSchedules(currentDate, lookaheadDays, displayDays, { force: true }).catch((err) => setError(err.message));
    } catch (err) {
      setError(err.message);
      window.alert(err.message);
    }
  }

  async function handleDelete() {
    setError('');
    setMessage('');
    try {
      await api.deleteSchedule(editId);
      setMessage('行程刪除成功');
      closeModal();
      await loadSchedules(currentDate, lookaheadDays, displayDays, { force: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFromSnapshot(schedule) {
    if (!canDeleteSchedule(schedule, userRole)) {
      setError('此班表已有回報紀錄，無法刪除');
      return;
    }

    const confirmMessage = hasScheduleReport(schedule)
      ? '確定刪除此工單？相關回報、郵資、匯款紀錄將一併刪除。'
      : '確定刪除此行程？';

    if (!window.confirm(confirmMessage)) {
      return;
    }
    setError('');
    setMessage('');
    try {
      await api.deleteSchedule(schedule.id);
      setMessage('行程刪除成功');
      closeSnapshot();
      await loadSchedules(currentDate, lookaheadDays, displayDays, { force: true });
    } catch (err) {
      setError(err.message);
    }
  }

  const handleNavigate = useCallback((date) => {
    setCurrentDate(date);
  }, []);

  const handleRegionMonthChange = useCallback((date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return;
    }

    setCurrentDate((current) => (
      current.getFullYear() === date.getFullYear() && current.getMonth() === date.getMonth()
        ? current
        : date
    ));
  }, []);

  function handleMiniRangeChange({ rangeStart, displayDays: nextDays }) {
    setCurrentDate(rangeStart);
    if (nextDays) {
      const safeDays = Math.min(7, Math.max(1, nextDays));
      setDisplayDays(safeDays);
      const nextSettings = { ...calendarSettings, displayDays: safeDays };
      setCalendarSettings(nextSettings);
      saveCalendarSettings(nextSettings);
    }
  }

  function handleCalendarSettingsChange(nextSettings) {
    setCalendarSettings(nextSettings);
    saveCalendarSettings(nextSettings);
    if (nextSettings.displayDays) {
      setDisplayDays(Math.min(7, Math.max(1, nextSettings.displayDays)));
    }
  }

  const handleCalendarViewChange = useCallback((view) => {
    const nextDisplayDays = view === 'day'
      ? 1
      : view === 'week'
        ? 7
        : displayDays;

    if (view === 'day' || view === 'week') {
      setDisplayDays(nextDisplayDays);
    }

    setCalendarSettings((current) => {
      const nextSettings = {
        ...current,
        defaultView: view,
        displayDays: nextDisplayDays,
      };
      saveCalendarSettings(nextSettings);
      return nextSettings;
    });
  }, [displayDays]);

  function goToday() {
    setCurrentDate(new Date());
  }

  function openSelectedDayList() {
    navigate(`/admin/schedules/day/${formatDateOnly(currentDate)}`);
  }

  function handleSuccessConfirm() {
    const summary = successSummary;
    const shouldRedirectToMail = pendingMailRedirect;
    setSuccessSummary(null);
    setPendingMailRedirect(false);

    if (shouldRedirectToMail) {
      navigate('/admin/mail-tracking');
      return;
    }

    if (summary?.work_date) {
      const workDate = new Date(`${formatDateOnly(summary.work_date)}T12:00:00`);
      if (!Number.isNaN(workDate.getTime())) {
        setCurrentDate(workDate);
      }
    }
  }

  const handleAvailabilityPickOpenSlot = useCallback(({ date, employeeId, slot, areas }) => {
    const nextDate = new Date(`${date}T12:00:00`);
    setCurrentDate(nextDate);
    if (isMobile) {
      setMobileFilterOpen(false);
    }
    if (areas?.length) {
      setSelectedAreas(areas);
    }
    const start = new Date(`${date}T${slot.from || '09:00'}:00`);
    let end = new Date(`${date}T${slot.to || '12:00'}:00`);
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    }
    if (isSlotInPast({ start, end }, { userRole })) {
      return;
    }
    setEditId(null);
    setEditingSchedule(null);
    setForm({
      ...applyPriceCalculation({
        ...slotToForm({ start, end }, { userRole }),
        user_id: String(employeeId),
        service_area: areas?.[0] || '',
      }),
    });
    setModalOpen(true);
    setMessage('');
    setError('');
  }, [isMobile, userRole]);

  const handleSelectCalendarEvent = useCallback((event) => {
    openSnapshot(event?.resource);
  }, [openSnapshot]);

  const handleDrillDown = useCallback((date) => {
    navigate(`/admin/schedules/day/${formatDateOnly(date)}`);
  }, [navigate]);

  const canDragCalendarEvent = useCallback(
    (schedule) => canDragScheduleEvent(schedule, userRole),
    [userRole],
  );

  const leaveRange = useMemo(() => getCalendarLoadRange(currentDate), [currentDate]);

  const calendarLeaves = useMemo(() => {
    if (!selectedEmployeeId) {
      return leaves;
    }

    return leaves.filter((leave) => String(leave.user_id) === String(selectedEmployeeId));
  }, [leaves, selectedEmployeeId]);

  function renderEmployeeStrip() {
    return (
      <div className="employee-strip employee-strip--compact">
        <button
          type="button"
          className={`employee-chip${selectedEmployeeId === '' ? ' is-active' : ''}`}
          onClick={() => setSelectedEmployeeId('')}
        >
          全部師傅
        </button>
        {employees.map((employee) => (
          <button
            key={employee.id}
            type="button"
            className={`employee-chip${String(selectedEmployeeId) === String(employee.id) ? ' is-active' : ''}`}
            onClick={() => setSelectedEmployeeId(String(employee.id))}
          >
            <EmployeeAvatar user={employee} size="sm" />
            {employee.name}
          </button>
        ))}
      </div>
    );
  }

  function renderScheduleFilterPanel() {
    return (
      <>
        <CalendarMiniMonth
          rangeStart={currentDate}
          displayDays={displayDays}
          onRangeChange={handleMiniRangeChange}
          schedules={schedules}
          weekStartsOn={1}
        />

        <div className="schedule-sidebar__actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={goToday}>
            今天
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openSelectedDayList}>
            當日列表
          </button>
        </div>

        <div className="schedule-sidebar__legend">
          {CUSTOMER_SOURCE_OPTIONS.map((option) => (
            <span key={option.value} className="schedule-sidebar__legend-item">
              <span className="source-badge__dot" style={{ backgroundColor: option.color }} />
              {option.label}
            </span>
          ))}
          <span className="schedule-sidebar__legend-item">
            <span className="source-badge__dot" style={{ backgroundColor: '#FBC02D' }} />
            休假
          </span>
        </div>

        {renderEmployeeStrip()}

        <ScheduleAreaFilter selectedAreas={selectedAreas} onChange={setSelectedAreas} />

        <CalendarSettingsPanel
          settings={calendarSettings}
          onChange={handleCalendarSettingsChange}
          showColorMode
        />
      </>
    );
  }

  return (
    <PageErrorBoundary title="派班行事曆載入失敗" resetKey={location.pathname}>
      <Layout title="派班行事曆">
        <section className={`card schedule-page-card${isMobile ? ' schedule-page-card--mobile-full' : ''}`}>
          {!isMobile && (
            <div className="card-header">
              <div>
                <h2 className="card-title">派班行事曆</h2>
                <p className="hint">上方勾選區域可查師傅空檔。左側月曆跳日期，點行程看詳情，空白時段可新增派工。</p>
              </div>
              <div className="schedule-page-header-actions">
                {canAccess(user, 'schedules.manage') && (
                  <Link to="/admin/projects" className="btn btn-secondary btn-sm">
                    專案區
                  </Link>
                )}
                {canAccess(user, 'phone.lookup') && (
                  <Link to="/admin/phone-lookup" className="btn btn-secondary btn-sm">
                    電話查詢
                  </Link>
                )}
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreate({ start: new Date(), useDefaultShift: true })}>
                  新增行程
                </button>
              </div>
            </div>
          )}

          {!isMobile && (
            <ScheduleEmployeeAvailabilityPanel
              selectedAreas={selectedAreas}
              onSelectedAreasChange={setSelectedAreas}
              lookaheadDays={lookaheadDays}
              onLookaheadDaysChange={setLookaheadDays}
              selectedEmployeeId={selectedEmployeeId}
              onPickOpenSlot={handleAvailabilityPickOpenSlot}
              onVisibleMonthChange={handleRegionMonthChange}
              employees={employees}
              allSchedules={allSchedules}
              leaves={leaves}
            />
          )}

          {isMobile && (
            <>
            <div className="schedule-mobile-toolbar" aria-label="派班快捷功能">
              <div className="schedule-mobile-toolbar__actions">
                <button
                  type="button"
                  className="schedule-mobile-toolbar__btn"
                  onClick={() => setMobileFilterOpen(true)}
                >
                  篩選
                </button>
                {canAccess(user, 'schedules.manage') && (
                  <Link to="/admin/regional-scheduling" className="schedule-mobile-toolbar__btn schedule-mobile-toolbar__link">
                    區域
                  </Link>
                )}
                {canAccess(user, 'phone.lookup') && (
                  <Link to="/admin/phone-lookup" className="schedule-mobile-toolbar__btn schedule-mobile-toolbar__link">
                    電話
                  </Link>
                )}
                <button
                  type="button"
                  className="schedule-mobile-toolbar__btn"
                  onClick={goToday}
                >
                  今天
                </button>
              </div>
              <button
                type="button"
                className="schedule-mobile-toolbar__fab"
                aria-label="新增行程"
                onClick={() => openCreate({ start: new Date(), useDefaultShift: true })}
              >
                +
              </button>
            </div>

            <div className="schedule-mobile-region-bar">
              <p className="schedule-mobile-region-bar__hint">
                請先點選縣市（高雄／屏東／台南），再勾選區域，例如「左營」或「屏東市」。
              </p>
              <ServiceAreaPicker
                mode="multiple"
                selectedValues={selectedAreas}
                onChange={setSelectedAreas}
                showClear={false}
                className="service-area-picker--mobile-inline"
              />
            </div>

            <div className="schedule-mobile-employee-bar">
              {renderEmployeeStrip()}
            </div>
            </>
          )}

          <div className={`schedule-layout${isDesktop ? ' schedule-layout--calendar-large' : ''}`}>
            {!isMobile && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary schedule-sidebar-toggle"
                  onClick={() => setSidebarOpen((open) => !open)}
                  aria-expanded={sidebarOpen}
                >
                  {sidebarOpen ? '收合篩選與月曆' : '展開篩選與月曆'}
                </button>

                <aside className={`schedule-sidebar schedule-sidebar--collapsible${sidebarOpen ? ' is-open' : ''}`}>
                  {renderScheduleFilterPanel()}
                </aside>
              </>
            )}

            <div className="schedule-main">
              {!isMobile && renderEmployeeStrip()}

              <div className="schedule-calendar-host">
                <Suspense fallback={<p className="hint schedule-calendar-pending">班表載入中…</p>}>
                <ScheduleCalendar
                  schedules={schedules}
                  leaves={calendarLeaves}
                  leaveRange={leaveRange}
                  currentDate={currentDate}
                  displayDays={displayDays}
                  onNavigate={handleNavigate}
                  onSelectEvent={handleSelectCalendarEvent}
                  onSelectSlot={openCreate}
                  onDrillDown={handleDrillDown}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  canDragEvent={canDragCalendarEvent}
                  selectable
                  colorMode={calendarSettings.colorMode}
                  settings={calendarSettings}
                  onViewChange={handleCalendarViewChange}
                  initialView={isMobile ? 'month' : null}
                  hidePrice={!canManageSchedulePricing(userRole)}
                />
                </Suspense>
              </div>
            </div>
          </div>

          {isMobile && mobileFilterOpen && (
            <>
              <button
                type="button"
                className="schedule-mobile-sheet-backdrop"
                aria-label="關閉篩選"
                onClick={() => setMobileFilterOpen(false)}
              />
              <aside className="schedule-mobile-sheet schedule-mobile-sheet--filter is-open" aria-label="篩選與設定">
                <div className="schedule-mobile-sheet__header">
                  <h3 className="schedule-mobile-sheet__title">篩選與設定</h3>
                  <button
                    type="button"
                    className="schedule-mobile-sheet__close"
                    aria-label="關閉"
                    onClick={() => setMobileFilterOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="schedule-mobile-sheet__body schedule-mobile-filter-panel">
                  {renderScheduleFilterPanel()}
                </div>
              </aside>
            </>
          )}
        </section>

        <PageAlert type="success" message={message} />
        <PageAlert type="error" message={error} />

        <Suspense fallback={null}>
        <ScheduleSuccessModal
          open={Boolean(successSummary)}
          summary={successSummary}
          onConfirm={handleSuccessConfirm}
        />

        <ScheduleSnapshotModal
          open={Boolean(snapshotSchedule)}
          schedule={snapshotSchedule}
          onClose={closeSnapshot}
          onEdit={openEditFromSnapshot}
          onDelete={handleDeleteFromSnapshot}
          userRole={userRole}
        />

        <ScheduleFormModal
          open={modalOpen}
          title={editId ? `編輯行程 #${editId}（可調整師傅）` : '新增派班行程'}
          form={form}
          employees={getFormEmployees()}
          editId={editId}
          canDelete={Boolean(editId) && canDeleteSchedule(editingSchedule, userRole)}
          userRole={userRole}
          originalSchedule={editId ? editingSchedule : null}
          allSchedules={allSchedules}
          leaves={leaves}
          error={error}
          onChange={setForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onLeaveCreated={() => loadSchedules(currentDate, lookaheadDays, displayDays, { force: true })}
        />
        </Suspense>
      </Layout>
    </PageErrorBoundary>
  );
}
