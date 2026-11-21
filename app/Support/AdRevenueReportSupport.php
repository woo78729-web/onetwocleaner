<?php

namespace App\Support;

use App\Models\DailySchedule;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AdRevenueReportSupport
{
    /** 月結：成交總額 × 比例 = 應付廠商廣告費 */
    public const VENDOR_FEE_RATE = 0.05;

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
    public static function resolveMonth(?string $yearMonth = null): array
    {
        if ($yearMonth && preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            $anchor = Carbon::createFromFormat('Y-m-d', $yearMonth.'-01', config('app.timezone'));
        } else {
            $anchor = Carbon::now(config('app.timezone'));
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
     * 只統計來源＝FB廣告；週次只列當月（週日起日在該月內）。
     * 「已收單」依姓名＋電話去重成組；歸週只看進單時間 created_at，改施工日不影響。
     * 成交總額仍加總各班表金額；items 供點開查帳。
     *
     * @return array{
     *   basis: string,
     *   weeks: list<array{
     *     week_start: string,
     *     week_end: string,
     *     label: string,
     *     orders_received: int,
     *     deal_amount: int,
     *     items: list<array<string, mixed>>
     *   }>,
     *   monthly: array{
     *     year_month: string,
     *     orders_received: int,
     *     deal_amount: int,
     *     vendor_fee_rate: float,
     *     vendor_fee_amount: int,
     *     items: list<array<string, mixed>>
     *   }
     * }
     */
    public static function build(?string $yearMonth = null): array
    {
        $month = self::resolveMonth($yearMonth);

        /** @var Collection<int, DailySchedule> $schedules */
        $schedules = DailySchedule::query()
            ->where('customer_source', CustomerSource::FB_AD)
            ->select([
                'id',
                'created_at',
                'work_date',
                'cleaning_price',
                'customer_name',
                'customer_phone',
                'fb_display_name',
            ])
            ->where('created_at', '>=', $month['month_start'])
            ->where('created_at', '<=', $month['month_end'])
            ->orderBy('created_at')
            ->get();

        $rows = [];
        $cursor = self::resolveWeek($month['month_start']->toDateString())['range_start']->copy();

        // 若月初不是週日，從「該月第一個週日」開始列週
        if ($cursor->format('Y-m') !== $month['year_month']) {
            $cursor->addWeek();
        }

        while ($cursor->format('Y-m') === $month['year_month']) {
            $week = self::resolveWeek($cursor->toDateString());
            // 當月金額：只計打單時間落在「該週 ∩ 該月」內
            $rangeStart = $week['range_start']->lt($month['month_start'])
                ? $month['month_start']->copy()
                : $week['range_start']->copy();
            $rangeEnd = $week['range_end']->gt($month['month_end'])
                ? $month['month_end']->copy()
                : $week['range_end']->copy();

            $matched = self::matchByCreatedAt($schedules, $rangeStart, $rangeEnd);
            $items = self::buildGroupItems($matched);

            $rows[] = [
                'week_start' => $week['week_start'],
                'week_end' => $week['week_end'],
                'label' => $week['label'],
                'orders_received' => count($items),
                'deal_amount' => (int) $matched->sum(fn (DailySchedule $schedule) => (int) $schedule->cleaning_price),
                'items' => $items,
            ];

            $cursor->addWeek();
        }

        $monthlyItems = self::buildGroupItems($schedules);
        $monthlyDealAmount = (int) $schedules->sum(fn (DailySchedule $schedule) => (int) $schedule->cleaning_price);

        return [
            'basis' => 'created_at',
            'weeks' => $rows,
            'monthly' => [
                'year_month' => $month['year_month'],
                'orders_received' => count($monthlyItems),
                'deal_amount' => $monthlyDealAmount,
                'vendor_fee_rate' => self::VENDOR_FEE_RATE,
                'vendor_fee_amount' => self::vendorFeeAmount($monthlyDealAmount),
                'items' => $monthlyItems,
            ],
        ];
    }

    /**
     * @param  Collection<int, DailySchedule>  $schedules
     * @return Collection<int, DailySchedule>
     */
    private static function matchByCreatedAt(Collection $schedules, Carbon $rangeStart, Carbon $rangeEnd): Collection
    {
        return $schedules->filter(function (DailySchedule $schedule) use ($rangeStart, $rangeEnd) {
            if (! $schedule->created_at) {
                return false;
            }

            $createdAt = Carbon::parse($schedule->created_at)->timezone(config('app.timezone'));

            return $createdAt->betweenIncluded($rangeStart, $rangeEnd);
        })->values();
    }

    /**
     * @param  Collection<int, DailySchedule>  $schedules
     * @return list<array<string, mixed>>
     */
    private static function buildGroupItems(Collection $schedules): array
    {
        $timezone = config('app.timezone');

        return $schedules
            ->groupBy(fn (DailySchedule $schedule) => self::groupKey($schedule))
            ->map(function (Collection $groupSchedules) use ($timezone) {
                /** @var DailySchedule $first */
                $first = $groupSchedules->sortBy('created_at')->first();
                $schedules = $groupSchedules
                    ->sortBy('created_at')
                    ->values()
                    ->map(function (DailySchedule $schedule) use ($timezone) {
                        $createdAt = Carbon::parse($schedule->created_at)->timezone($timezone);

                        return [
                            'schedule_id' => $schedule->id,
                            'intake_at' => $createdAt->format('Y-m-d H:i'),
                            'intake_date' => $createdAt->toDateString(),
                            'work_date' => $schedule->work_date?->format('Y-m-d'),
                            'amount' => (int) $schedule->cleaning_price,
                        ];
                    })
                    ->all();

                return [
                    'group_key' => self::groupKey($first),
                    'customer_name' => self::displayName($first),
                    'customer_phone' => (string) ($first->customer_phone ?: ''),
                    'schedule_count' => count($schedules),
                    'deal_amount' => (int) collect($schedules)->sum('amount'),
                    'first_intake_at' => $schedules[0]['intake_at'] ?? null,
                    'schedules' => $schedules,
                ];
            })
            ->sortBy('first_intake_at')
            ->values()
            ->all();
    }

    public static function groupKey(DailySchedule $schedule): string
    {
        $name = self::normalizeName(
            (string) ($schedule->customer_name ?: ($schedule->fb_display_name ?: ''))
        );
        $phone = self::normalizePhone($schedule->customer_phone);

        if ($name === '' && $phone === '') {
            return 'id:'.$schedule->id;
        }

        return $name.'|'.$phone;
    }

    private static function displayName(DailySchedule $schedule): string
    {
        return trim((string) ($schedule->customer_name ?: ($schedule->fb_display_name ?: '未填名稱'))) ?: '未填名稱';
    }

    private static function normalizeName(?string $value): string
    {
        $name = trim((string) $value);
        $name = preg_replace('/\s+/u', '', $name) ?? '';

        return mb_strtolower($name);
    }

    private static function normalizePhone(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }
}
