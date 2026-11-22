import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EmployeeLeaveReminderModal } from './EmployeeLeaveReminderModal';

export function EmployeeLeaveReminderHost() {
  const { user } = useAuth();
  const [reminder, setReminder] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const isEmployee = user?.role === 'employee';

  const applyReminder = useCallback((nextReminder) => {
    setReminder(nextReminder || null);

    if (!nextReminder?.should_show) {
      setOpen(false);
      hasAutoOpenedRef.current = false;
      return;
    }

    if (!hasAutoOpenedRef.current) {
      setOpen(true);
      hasAutoOpenedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isEmployee) {
      setReminder(null);
      setOpen(false);
      hasAutoOpenedRef.current = false;
      return undefined;
    }

    let cancelled = false;

    function loadReminder() {
      api.getEmployeeLeaveReminder()
        .then((result) => {
          if (cancelled) {
            return;
          }

          applyReminder(result.data || null);
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setReminder(null);
          setOpen(false);
        });
    }

    loadReminder();
    window.addEventListener('ac:employee-leave-reminder-refresh', loadReminder);

    return () => {
      cancelled = true;
      window.removeEventListener('ac:employee-leave-reminder-refresh', loadReminder);
    };
  }, [applyReminder, isEmployee]);

  async function handleConfirm() {
    if (!reminder?.target_month) {
      setOpen(false);
      return;
    }

    setConfirming(true);

    try {
      const result = await api.acknowledgeEmployeeLeaveReminder(reminder.target_month);
      applyReminder(result.data || { ...reminder, should_show: false, has_scheduled: true });
      setOpen(false);
    } catch {
      setOpen(false);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <EmployeeLeaveReminderModal
      open={open}
      reminder={reminder}
      onClose={() => setOpen(false)}
      onConfirm={handleConfirm}
      confirming={confirming}
    />
  );
}
