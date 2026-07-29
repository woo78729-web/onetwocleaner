import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { captureElementAsPng } from '../utils/captureElement';
import {
  buildScheduleSuccessScreenshotName,
  formatScheduleSuccessDateTime,
  formatSuccessSummaryAcUnits,
  formatSuccessSummaryTotalPrice,
} from '../utils/scheduleCalendar';
import './schedule-calendar.css';

export function ScheduleSuccessModal({ open, summary, onConfirm }) {
  const modalRef = useRef(null);
  const downloadButtonRef = useRef(null);
  const captureTokenRef = useRef(0);
  const [screenshotHint, setScreenshotHint] = useState('');
  const [capturing, setCapturing] = useState(false);

  const captureScreenshot = useCallback(async ({ silent = false } = {}) => {
    if (!summary || !modalRef.current) {
      return false;
    }

    setCapturing(true);

    try {
      const success = await captureElementAsPng(modalRef.current, {
        filename: buildScheduleSuccessScreenshotName(summary),
      });

      if (!silent || success) {
        setScreenshotHint(success
          ? '已自動下載截圖，可直接傳給客戶'
          : '無法自動下載，請再按一次「下載截圖」');
      }

      return success;
    } catch {
      setScreenshotHint('無法自動下載，請再按一次「下載截圖」');
      return false;
    } finally {
      setCapturing(false);
    }
  }, [summary]);

  useEffect(() => {
    if (!open) {
      setScreenshotHint('');
      captureTokenRef.current += 1;
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !summary) {
      return undefined;
    }

    const token = captureTokenRef.current + 1;
    captureTokenRef.current = token;
    let cancelled = false;

    const run = async () => {
      // Wait two frames so fonts/layout settle, then capture.
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(resolve);
        });
      });

      if (cancelled || captureTokenRef.current !== token || !modalRef.current) {
        return;
      }

      const success = await captureScreenshot({ silent: true });

      if (!cancelled && !success) {
        downloadButtonRef.current?.focus?.();
      }
    };

    const timer = window.setTimeout(run, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, summary, captureScreenshot]);

  if (!open || !summary) {
    return null;
  }

  return (
    <div
      className="modal-overlay schedule-success-overlay"
      role="presentation"
      onClick={onConfirm}
    >
      <div
        ref={modalRef}
        className="schedule-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-success-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-success-modal__icon" aria-hidden="true">✓</div>
        <h3 id="schedule-success-title" className="schedule-success-modal__title">
          預約完成
        </h3>

        <dl className="schedule-success-modal__list">
          <div className="schedule-success-modal__row">
            <dt>清洗時間</dt>
            <dd>{formatScheduleSuccessDateTime(summary)}</dd>
          </div>
          <div className="schedule-success-modal__row">
            <dt>清洗人</dt>
            <dd>{summary.employee_name || '未指定'}</dd>
          </div>
          <div className="schedule-success-modal__row schedule-success-modal__row--emphasis">
            <dt>清洗台數</dt>
            <dd>{formatSuccessSummaryAcUnits(summary)}</dd>
          </div>
          <div className="schedule-success-modal__row schedule-success-modal__row--emphasis">
            <dt>金額</dt>
            <dd>{formatSuccessSummaryTotalPrice(summary)}</dd>
          </div>
          <div className="schedule-success-modal__row">
            <dt>清洗地址</dt>
            <dd>{summary.customer_address || '-'}</dd>
          </div>
          <div className="schedule-success-modal__row">
            <dt>客戶電話</dt>
            <dd>{summary.customer_phone || '-'}</dd>
          </div>
        </dl>

        {screenshotHint ? (
          <p className="schedule-success-modal__hint">{screenshotHint}</p>
        ) : null}

        <div className="schedule-success-modal__actions">
          <button
            ref={downloadButtonRef}
            type="button"
            className="btn btn-primary btn-pill schedule-success-modal__download"
            disabled={capturing}
            onClick={() => captureScreenshot()}
          >
            {capturing ? '截圖中...' : '下載截圖'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-pill schedule-success-modal__action"
            onClick={onConfirm}
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
