import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { PageAlert } from '../components/PageAlert';
import { api } from '../api/client';
import '../components/schedule-calendar.css';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-TW');
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => {
      const text = cell == null ? '' : String(cell);
      return `"${text.replace(/"/g, '""')}"`;
    }).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AdRevenueDetailModal({ open, title, items, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-panel modal-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-revenue-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="ad-revenue-detail-title" className="modal-title">{title}</h2>
            <p className="hint">同名同電話為一組；進單日依建立時間，方便對帳。</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            關閉
          </button>
        </div>

        <div className="table-wrap" style={{ padding: '0 16px 16px' }}>
          {!items.length ? (
            <p className="hint">這個區間沒有收單組。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>組別</th>
                  <th>姓名</th>
                  <th>電話</th>
                  <th>進單時間</th>
                  <th>施工日</th>
                  <th>班表</th>
                  <th>金額</th>
                </tr>
              </thead>
              <tbody>
                {items.flatMap((group, groupIndex) => (
                  (group.schedules || []).map((schedule, scheduleIndex) => (
                    <tr key={`${group.group_key}-${schedule.schedule_id}`}>
                      {scheduleIndex === 0 ? (
                        <td rowSpan={group.schedules.length} className="num">
                          {groupIndex + 1}
                        </td>
                      ) : null}
                      {scheduleIndex === 0 ? (
                        <td rowSpan={group.schedules.length}>{group.customer_name}</td>
                      ) : null}
                      {scheduleIndex === 0 ? (
                        <td rowSpan={group.schedules.length}>{group.customer_phone || '—'}</td>
                      ) : null}
                      <td className="num">{schedule.intake_at}</td>
                      <td className="num">{schedule.work_date || '—'}</td>
                      <td className="num">#{schedule.schedule_id}</td>
                      <td className="num">{formatMoney(schedule.amount)}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAdRevenueReportPage() {
  const [yearMonth, setYearMonth] = useState(() => currentYearMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailItems, setDetailItems] = useState([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getAdRevenueReport({
        year_month: yearMonth,
      });
      setReport(result.data);
      if (result.data?.monthly?.year_month) {
        setYearMonth(result.data.monthly.year_month);
      }
    } catch (err) {
      setReport(null);
      setError(err?.message || '廣告收益回報載入失敗');
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const weeks = report?.weeks || [];
  const monthly = report?.monthly || {
    year_month: yearMonth,
    orders_received: 0,
    deal_amount: 0,
    vendor_fee_rate: 0.05,
    vendor_fee_amount: 0,
    items: [],
  };
  const feePercent = Math.round(Number(monthly.vendor_fee_rate || 0.05) * 100);

  function openDetail(title, items) {
    setDetailTitle(title);
    setDetailItems(items || []);
    setDetailOpen(true);
  }

  const handleExport = () => {
    if (!weeks.length && !monthly.deal_amount) {
      return;
    }

    downloadCsv(`廣告收益回報_${monthly.year_month}.csv`, [
      ['日期(周)', '已收單(組)', '成交總額'],
      ...weeks.map((week) => [
        week.label,
        week.orders_received,
        week.deal_amount,
      ]),
      [],
      ['月結月份', '月收單組數', '月成交總額', `廠商廣告費(${feePercent}%)`],
      [
        monthly.year_month,
        monthly.orders_received,
        monthly.deal_amount,
        monthly.vendor_fee_amount,
      ],
      [],
      ['組別', '姓名', '電話', '進單時間', '施工日', '班表', '金額', '週次'],
      ...weeks.flatMap((week) => (
        (week.items || []).flatMap((group, groupIndex) => (
          (group.schedules || []).map((schedule) => [
            groupIndex + 1,
            group.customer_name,
            group.customer_phone || '',
            schedule.intake_at,
            schedule.work_date || '',
            schedule.schedule_id,
            schedule.amount,
            week.label,
          ])
        ))
      )),
    ]);
  };

  return (
    <Layout title="廣告收益回報">
      <PageAlert message={error} onClose={() => setError('')} />

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 className="card-title">廣告收益回報</h2>
            <p className="hint">
              只顯示所選月份的 FB廣告週次；已收單依同名同電話併成一組，點數字可查看進單日與班表明細，歸週只看進單時間（改施工日不影響），月成交總額 × {feePercent}%＝廠商廣告費。
            </p>
          </div>
          <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setYearMonth(currentYearMonth())}
            >
              回到本月
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={loading}>
              匯出 CSV
            </button>
          </div>
        </div>

        <div
          className="form-grid"
          style={{
            padding: '0 16px 16px',
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <label className="field">
            <span className="field-label">月份</span>
            <input
              type="month"
              value={yearMonth}
              onChange={(event) => setYearMonth(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="card-title">月結廣告費</h2>
          <p className="hint">月成交總額 × {feePercent}% = 應付廠商廣告費（僅 FB廣告）</p>
        </div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', padding: '0 16px 16px' }}>
          <div className="partner-settlement-hero">
            <p className="partner-settlement-hero__label">{monthly.year_month} 收單組數</p>
            <p className="partner-settlement-hero__value">
              {loading ? '…' : (
                Number(monthly.orders_received) > 0 ? (
                  <button
                    type="button"
                    className="ad-revenue-count-btn"
                    onClick={() => openDetail(`${monthly.year_month} 月收單明細`, monthly.items || [])}
                  >
                    {monthly.orders_received}
                  </button>
                ) : monthly.orders_received
              )}
            </p>
          </div>
          <div className="partner-settlement-hero">
            <p className="partner-settlement-hero__label">月廣告成效總額</p>
            <p className="partner-settlement-hero__value">
              {loading ? '…' : `${formatMoney(monthly.deal_amount)} 元`}
            </p>
          </div>
          <div className="partner-settlement-hero">
            <p className="partner-settlement-hero__label">廠商廣告費（{feePercent}%）</p>
            <p className="partner-settlement-hero__value">
              {loading ? '…' : `${formatMoney(monthly.vendor_fee_amount)} 元`}
            </p>
          </div>
        </div>
      </section>

      <section className="card table-card">
        <div className="card-header" style={{ padding: '16px 16px 0' }}>
          <h2 className="card-title">成效指標追蹤</h2>
          <p className="hint">只列當月週次（週日～週六）；點「已收單(組)」可看每一組／每一筆。</p>
        </div>
        <div className="table-wrap">
          {loading ? (
            <p className="hint" style={{ padding: 16 }}>載入中…</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>日期(周)</th>
                  <th>已收單(組)</th>
                  <th>成交總額</th>
                </tr>
              </thead>
              <tbody>
                {weeks.length === 0 ? (
                  <tr>
                    <td colSpan={3}>尚無資料</td>
                  </tr>
                ) : weeks.map((week) => (
                  <tr key={week.week_start}>
                    <td className="num">{week.label}</td>
                    <td className="num">
                      {Number(week.orders_received) > 0 ? (
                        <button
                          type="button"
                          className="ad-revenue-count-btn"
                          onClick={() => openDetail(`${week.label} 收單明細`, week.items || [])}
                        >
                          {week.orders_received}
                        </button>
                      ) : week.orders_received}
                    </td>
                    <td className="num">{formatMoney(week.deal_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {weeks.length > 0 && (
                <tfoot>
                  <tr>
                    <td>月合計</td>
                    <td className="num">
                      {Number(monthly.orders_received) > 0 ? (
                        <button
                          type="button"
                          className="ad-revenue-count-btn"
                          onClick={() => openDetail(`${monthly.year_month} 月收單明細`, monthly.items || [])}
                        >
                          {monthly.orders_received}
                        </button>
                      ) : monthly.orders_received}
                    </td>
                    <td className="num">{formatMoney(monthly.deal_amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </section>

      <AdRevenueDetailModal
        open={detailOpen}
        title={detailTitle}
        items={detailItems}
        onClose={() => setDetailOpen(false)}
      />
    </Layout>
  );
}
