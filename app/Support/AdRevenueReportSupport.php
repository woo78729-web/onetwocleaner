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

    /**
     * @return list<string>
     */
    public static function bases(): array
    {
        return [self::BASIS_SCHEDULED_AT, self::BASIS_WORK_DATE];
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
     * 依排單時間（或施工日）彙總每週 FB 收單量與成交金額。
     *
     * @return array{
     *   basis: string,
     *   weeks: list<array{
     *     week_start: string,
     *     week_end: string,
     *     label: string,
     *     orders_received: int,
     *     deal_amount: int
     *   }>
     * }
     */
    public static function build(?string $weekStart = null, string $basis = self::BASIS_SCHEDULED_AT, int $weeks = self::DEFAULT_WEEKS): array
    {
        $basis = in_array($basis, self::bases(), true) ? $basis : self::BASIS_SCHEDULED_AT;
        $weeks = max(1, min(52, $weeks));

        $latest = self::resolveWeek($weekStart);
        $oldestStart = $latest['range_start']->copy()->subWeeks($weeks - 1)->startOfDay();

        $query = DailySchedule::query()
            ->where('customer_source', CustomerSource::FB)
            ->select(['id', 'created_at', 'work_date', 'cleaning_price']);

        if ($basis === self::BASIS_WORK_DATE) {
            $query
                ->whereDate('work_date', '>=', $oldestStart->toDateString())
                ->whereDate('work_date', '<=', $latest['week_end']);
        } else {
            $query
                ->where('created_at', '>=', $oldestStart)
                ->where('created_at', '<=', $latest['range_end']);
        }

        /** @var Collection<int, DailySchedule> $schedules */
        $schedules = $query->get();

        $rows = [];

        for ($offset = $weeks - 1; $offset >= 0; $offset--) {
            $weekAnchor = $latest['range_start']->copy()->subWeeks($offset);
            $week = self::resolveWeek($weekAnchor->toDateString());

            $matched = $schedules->filter(function (DailySchedule $schedule) use ($basis, $week) {
                if ($basis === self::BASIS_WORK_DATE) {
                    $workDate = $schedule->work_date?->format('Y-m-d');

                    return $workDate !== null
                        && $workDate >= $week['week_start']
                        && $workDate <= $week['week_end'];
                }

                if (! $schedule->created_at) {
                    return false;
                }

                $createdAt = Carbon::parse($schedule->created_at)->timezone(config('app.timezone'));

                return $createdAt->betweenIncluded($week['range_start'], $week['range_end']);
            });

            $rows[] = [
                'week_start' => $week['week_start'],
                'week_end' => $week['week_end'],
                'label' => $week['label'],
                'orders_received' => $matched->count(),
                'deal_amount' => (int) $matched->sum(fn (DailySchedule $schedule) => (int) $schedule->cleaning_price),
            ];
        }

        return [
            'basis' => $basis,
            'weeks' => $rows,
        ];
    }
}
