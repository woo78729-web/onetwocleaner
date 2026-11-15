import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { PageAlert } from '../components/PageAlert';
import { api } from '../api/client';
import '../components/schedule-calendar.css';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-TW');
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function startOfWeekSunday(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() - next.getDay());
  return next;
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

export default function AdminAdRevenueReportPage() {
  const [anchorWeek, setAnchorWeek] = useState(() => toDateInputValue(startOfWeekSunday()));
  const [yearMonth, setYearMonth] = useState(() => currentYearMonth());
  const [basis, setBasis] = useState('scheduled_at');
  const [weeksCount, setWeeksCount] = useState(8);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getAdRevenueReport({
        week_start: anchorWeek,
        year_month: yearMonth,
        basis,
        weeks: weeksCount,
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
  }, [anchorWeek, yearMonth, basis, weeksCount]);

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
  };
  const feePercent = Math.round(Number(monthly.vendor_fee_rate || 0.05) * 100);
  const totals = weeks.reduce((summary, week) => ({
    orders_received: summary.orders_received + Number(week.orders_received || 0),
    deal_amount: summary.deal_amount + Number(week.deal_amount || 0),
  }), { orders_received: 0, deal_amount: 0 });

  const handleExport = () => {
    if (!weeks.length && !monthly.deal_amount) {
      return;
    }

    downloadCsv(`廣告收益回報_${monthly.year_month}.csv`, [
      ['日期(周)', '已收單', '成交總額'],
      ...weeks.map((week) => [
        week.label,
        week.orders_received,
        week.deal_amount,
      ]),
      ['週次合計', totals.orders_received, totals.deal_amount],
      [],
      ['月結月份', '月收單量', '月成交總額', `廠商廣告費(${feePercent}%)`],
      [
        monthly.year_month,
        monthly.orders_received,
        monthly.deal_amount,
        monthly.vendor_fee_amount,
      ],
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
              依 FB 排單統計每週收單／成交，並以月成交總額計算 {feePercent}% 廠商廣告費。
            </p>
          </div>
          <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAnchorWeek(toDateInputValue(startOfWeekSunday()));
                setYearMonth(currentYearMonth());
              }}
            >
              回到本週／本月
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
            <span className="field-label">統計截止週（任選該週一天）</span>
            <input
              type="date"
              value={anchorWeek}
              onChange={(event) => setAnchorWeek(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">月結月份</span>
            <input
              type="month"
              value={yearMonth}
              onChange={(event) => setYearMonth(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">顯示週數</span>
            <select value={weeksCount} onChange={(event) => setWeeksCount(Number(event.target.value))}>
              <option value={4}>近 4 週</option>
              <option value={8}>近 8 週</option>
              <option value={12}>近 12 週</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">統計依據</span>
            <select value={basis} onChange={(event) => setBasis(event.target.value)}>
              <option value="scheduled_at">排單時間（建議）</option>
              <option value="work_date">施工日</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="card-title">月結廣告費</h2>
          <p className="hint">月成交總額 × {feePercent}% = 應付廠商廣告費</p>
        </div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', padding: '0 16px 16px' }}>
          <div className="partner-settlement-hero">
            <p className="partner-settlement-hero__label">{monthly.year_month} 收單量</p>
            <p className="partner-settlement-hero__value">{loading ? '…' : monthly.orders_received}</p>
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
          <p className="hint">只顯示業主需回報的兩欄：已收單、成交總額。</p>
        </div>
        <div className="table-wrap">
          {loading ? (
            <p className="hint" style={{ padding: 16 }}>載入中…</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>日期(周)</th>
                  <th>已收單</th>
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
                    <td className="num">{week.orders_received}</td>
                    <td className="num">{formatMoney(week.deal_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {weeks.length > 0 && (
                <tfoot>
                  <tr>
                    <td>合計</td>
                    <td className="num">{totals.orders_received}</td>
                    <td className="num">{formatMoney(totals.deal_amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </section>
    </Layout>
  );
}
