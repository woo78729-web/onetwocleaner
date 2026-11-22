import { Link } from 'react-router-dom';

export function EmployeeLeaveReminderModal({
  open,
  reminder,
  onClose,
  onConfirm,
  confirming = false,
}) {
  if (!open || !reminder?.should_show) {
    return null;
  }

  return (
    <div className="modal-overlay schedule-form-overlay" role="presentation">
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-leave-reminder-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="employee-leave-reminder-title" className="modal-title">排假提醒</h2>
            <p className="hint">
              {reminder.message || `請排 ${reminder.target_month_label || '下個月'} 休假。`}
            </p>
          </div>
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <p className="hint" style={{ margin: 0 }}>
            開放期間：每月 {reminder.window_start_day}–{reminder.window_end_day} 日
          </p>
          <p className="hint" style={{ margin: '6px 0 0' }}>
            目標月份：{reminder.target_month_label || reminder.target_month}
          </p>
        </div>

        <div className="modal-actions">
          <Link
            to={reminder.leave_path || '/employee/leaves'}
            className="btn btn-primary btn-pill"
            onClick={onClose}
          >
            前往排假
          </Link>
          <button
            type="button"
            className="btn btn-secondary btn-pill"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? '確認中…' : '已排好／確認'}
          </button>
        </div>
      </div>
    </div>
  );
}
