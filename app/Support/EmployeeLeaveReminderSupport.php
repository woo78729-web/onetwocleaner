<?php

namespace App\Support;

use App\Models\EmployeeLeave;
use App\Models\EmployeeLeaveReminderAck;
use App\Models\User;
use Carbon\Carbon;

class EmployeeLeaveReminderSupport
{
    /**
     * @return array{
     *   should_show: bool,
     *   target_month: string,
     *   target_month_label: string,
     *   window_start_day: int,
     *   window_end_day: int,
     *   registration_open: bool,
     *   has_scheduled: bool,
     *   leave_path: string,
     *   message: string
     * }
     */
    public static function status(User $user, ?Carbon $now = null): array
    {
        $now ??= Carbon::now(config('app.timezone'));
        $targetMonth = $now->copy()->addMonth()->format('Y-m');
        $registration = SchedulePlanningSupport::employeeLeaveRegistration($user, $now);
        $inWindow = SchedulePlanningSupport::isLeaveRegistrationOpen($now)
            && in_array($targetMonth, $registration['allowed_months'], true);
        $hasScheduled = self::hasScheduledForMonth($user, $targetMonth);
        $shouldShow = $inWindow && ! $hasScheduled;

        return [
            'should_show' => $shouldShow,
            'target_month' => $targetMonth,
            'target_month_label' => Carbon::createFromFormat('Y-m-d', $targetMonth.'-01')->format('Y年n月'),
            'window_start_day' => SchedulePlanningSupport::LEAVE_WINDOW_START_DAY,
            'window_end_day' => SchedulePlanningSupport::LEAVE_WINDOW_END_DAY,
            'registration_open' => $inWindow,
            'has_scheduled' => $hasScheduled,
            'leave_path' => '/employee/leaves',
            'message' => $shouldShow
                ? sprintf(
                    '每月 %d–%d 日可排 %s 休假，請盡快完成排假；排好後就不會再提醒。',
                    SchedulePlanningSupport::LEAVE_WINDOW_START_DAY,
                    SchedulePlanningSupport::LEAVE_WINDOW_END_DAY,
                    Carbon::createFromFormat('Y-m-d', $targetMonth.'-01')->format('Y年n月')
                )
                : ($hasScheduled
                    ? '下個月排假已完成，無需再提醒。'
                    : SchedulePlanningSupport::leaveRegistrationMessage($now)),
        ];
    }

    public static function hasScheduledForMonth(User $user, string $yearMonth): bool
    {
        if (EmployeeLeaveReminderAck::query()
            ->where('user_id', $user->id)
            ->where('year_month', $yearMonth)
            ->exists()) {
            return true;
        }

        $monthStart = Carbon::createFromFormat('Y-m-d', $yearMonth.'-01', config('app.timezone'))->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        return EmployeeLeave::query()
            ->where('user_id', $user->id)
            ->where('leave_type', EmployeeLeave::TYPE_DATE)
            ->whereBetween('leave_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->exists();
    }

    public static function acknowledge(User $user, string $yearMonth): void
    {
        EmployeeLeaveReminderAck::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'year_month' => $yearMonth,
            ],
            []
        );
    }

    public static function acknowledgeLeaveDate(User $user, string $leaveDate): void
    {
        $yearMonth = Carbon::parse($leaveDate, config('app.timezone'))->format('Y-m');
        $targetMonth = Carbon::now(config('app.timezone'))->addMonth()->format('Y-m');

        if ($yearMonth !== $targetMonth) {
            return;
        }

        if (! SchedulePlanningSupport::isLeaveRegistrationOpen()) {
            return;
        }

        self::acknowledge($user, $yearMonth);
    }
}
