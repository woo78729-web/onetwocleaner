<?php

namespace App\Support;

use App\Models\DailySchedule;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AdRevenueReportSupport
{
    public const BASIS_SCHEDULED_AT = 'scheduled_at';

    public const BASIS_WORK_DATE = 'work_date';

    public const DEFAULT_WEEKS = 8;

    /** 月結：成交總額 × 比例 = 應付廠商廣告費 */
    public const VENDOR_FEE_RATE = 0.05;

    /**
     * @return list<string>
     */
    public static function bases(): array
    {
        return [self::BASIS_SCHEDULED_AT, self::BASIS_WORK_DATE];
    }

    public static function vendorFeeAmount(int $dealAmount): int
    {
        return (int) round($dealAmount * self::VENDOR_FEE_RATE);
    }

    /**
     * @return array{week_start: string, week_end: string, range_start: Carbon, range_end: Carbon, label: string}
     */
    public static function resolveWeek(?string $weekStart = null): array
    {
        $anchor = $weekStart
            ? Carbon::parse($weekStart, config('app.timezone'))
            : Carbon::now(config('app.timezone'));

        // 與成效指標追蹤表一致：週日～週六（例 1108-1114、1115-1121）
        $start = $anchor->copy()->startOfWeek(Carbon::SUNDAY)->startOfDay();
        $end = $start->copy()->addDays(6)->endOfDay();

        return [
            'week_start' => $start->toDateString(),
            'week_end' => $end->toDateString(),
            'range_start' => $start,
            'range_end' => $end,
            'label' => self::weekLabel($start, $end),
        ];
    }

    public static function weekLabel(Carbon $start, Carbon $end): string
    {
        return $start->format('md').'-'.$end->format('md');
    }

    /**
     * @return array{year_month: string, month_start: Carbon, month_end: Carbon}
     */
    public static function resolveMonth(?string $yearMonth = null, ?string $fallbackDate = null): array
    {
        if ($yearMonth && preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            $anchor = Carbon::createFromFormat('Y-m-d', $yearMonth.'-01', config('app.timezone'));
        } else {
            $anchor = $fallbackDate
                ? Carbon::parse($fallbackDate, config('app.timezone'))
                : Carbon::now(config('app.timezone'));
        }

        $start = $anchor->copy()->startOfMonth()->startOfDay();
        $end = $anchor->copy()->endOfMonth()->endOfDay();

        return [
            'year_month' => $start->format('Y-m'),
            'month_start' => $start,
            'month_end' => $end,
        ];
    }

    /**
     * 依排單時間（或施工日）彙總每週 FB 收單量與成交金額，並附月結廣告費。
     *
     * @return array{
     *   basis: string,
     *   weeks: list<array{
     *     week_start: string,
     *     week_end: string,
     *     label: string,
     *     orders_received: int,
     *     deal_amount: int
     *   }>,
     *   monthly: array{
     *     year_month: string,
     *     orders_received: int,
     *     deal_amount: int,
     *     vendor_fee_rate: float,
     *     vendor_fee_amount: int
     *   }
     * }
     */
    public static function build(
        ?string $weekStart = null,
        string $basis = self::BASIS_SCHEDULED_AT,
        int $weeks = self::DEFAULT_WEEKS,
        ?string $yearMonth = null,
    ): array {
        $basis = in_array($basis, self::bases(), true) ? $basis : self::BASIS_SCHEDULED_AT;
        $weeks = max(1, min(52, $weeks));

        $latest = self::resolveWeek($weekStart);
        $oldestStart = $latest['range_start']->copy()->subWeeks($weeks - 1)->startOfDay();
        $month = self::resolveMonth($yearMonth, $latest['week_start']);

        $rangeStart = $oldestStart->lt($month['month_start']) ? $oldestStart->copy() : $month['month_start']->copy();
        $rangeEnd = $latest['range_end']->gt($month['month_end']) ? $latest['range_end']->copy() : $month['month_end']->copy();

        $query = DailySchedule::query()
            ->where('customer_source', CustomerSource::FB)
            ->select(['id', 'created_at', 'work_date', 'cleaning_price']);

        if ($basis === self::BASIS_WORK_DATE) {
            $query
                ->whereDate('work_date', '>=', $rangeStart->toDateString())
                ->whereDate('work_date', '<=', $rangeEnd->toDateString());
        } else {
            $query
                ->where('created_at', '>=', $rangeStart)
                ->where('created_at', '<=', $rangeEnd);
        }

        /** @var Collection<int, DailySchedule> $schedules */
        $schedules = $query->get();

        $rows = [];

        for ($offset = $weeks - 1; $offset >= 0; $offset--) {
            $weekAnchor = $latest['range_start']->copy()->subWeeks($offset);
            $week = self::resolveWeek($weekAnchor->toDateString());
            $matched = self::matchSchedules($schedules, $basis, $week['range_start'], $week['range_end'], $week['week_start'], $week['week_end']);

            $rows[] = [
                'week_start' => $week['week_start'],
                'week_end' => $week['week_end'],
                'label' => $week['label'],
                'orders_received' => $matched->count(),
                'deal_amount' => (int) $matched->sum(fn (DailySchedule $schedule) => (int) $schedule->cleaning_price),
            ];
        }

        $monthlyMatched = self::matchSchedules(
            $schedules,
            $basis,
            $month['month_start'],
            $month['month_end'],
            $month['month_start']->toDateString(),
            $month['month_end']->toDateString(),
        );
        $monthlyDealAmount = (int) $monthlyMatched->sum(fn (DailySchedule $schedule) => (int) $schedule->cleaning_price);

        return [
            'basis' => $basis,
            'weeks' => $rows,
            'monthly' => [
                'year_month' => $month['year_month'],
                'orders_received' => $monthlyMatched->count(),
                'deal_amount' => $monthlyDealAmount,
                'vendor_fee_rate' => self::VENDOR_FEE_RATE,
                'vendor_fee_amount' => self::vendorFeeAmount($monthlyDealAmount),
            ],
        ];
    }

    /**
     * @param  Collection<int, DailySchedule>  $schedules
     * @return Collection<int, DailySchedule>
     */
    private static function matchSchedules(
        Collection $schedules,
        string $basis,
        Carbon $rangeStart,
        Carbon $rangeEnd,
        string $dateStart,
        string $dateEnd,
    ): Collection {
        return $schedules->filter(function (DailySchedule $schedule) use ($basis, $rangeStart, $rangeEnd, $dateStart, $dateEnd) {
            if ($basis === self::BASIS_WORK_DATE) {
                $workDate = $schedule->work_date?->format('Y-m-d');

                return $workDate !== null
                    && $workDate >= $dateStart
                    && $workDate <= $dateEnd;
            }

            if (! $schedule->created_at) {
                return false;
            }

            $createdAt = Carbon::parse($schedule->created_at)->timezone(config('app.timezone'));

            return $createdAt->betweenIncluded($rangeStart, $rangeEnd);
        })->values();
    }
}
