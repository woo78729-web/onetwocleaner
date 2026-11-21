<?php

namespace App\Support;

use App\Models\DailySchedule;
use App\Models\ScheduleAnnouncementEvent;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ScheduleAnnouncementSupport
{
    public static function recordCancel(DailySchedule $schedule, ?User $actor = null): void
    {
        self::createEvent(
            ScheduleAnnouncementEvent::TYPE_CANCEL,
            $schedule,
            $actor,
            workDate: $schedule->work_date?->format('Y-m-d'),
        );
    }

    public static function recordDateChange(
        DailySchedule $schedule,
        string $previousWorkDate,
        string $newWorkDate,
        ?User $actor = null,
    ): void {
        if ($previousWorkDate === $newWorkDate) {
            return;
        }

        self::createEvent(
            ScheduleAnnouncementEvent::TYPE_DATE_CHANGE,
            $schedule,
            $actor,
            workDate: $newWorkDate,
            previousWorkDate: $previousWorkDate,
        );
    }

    private static function createEvent(
        string $eventType,
        DailySchedule $schedule,
        ?User $actor = null,
        ?string $workDate = null,
        ?string $previousWorkDate = null,
    ): void {
        $actor ??= Auth::user();
        $schedule->loadMissing('user:id,name');

        $source = (string) ($schedule->customer_source ?: CustomerSource::PHONE);
        $contactName = match (true) {
            $source === CustomerSource::LINE => $schedule->line_display_name ?: ($schedule->customer_name ?: '未填名稱'),
            CustomerSource::isFacebookFamily($source) => $schedule->fb_display_name ?: ($schedule->customer_name ?: '未填名稱'),
            default => $schedule->customer_name ?: '未填名稱',
        };

        ScheduleAnnouncementEvent::query()->create([
            'event_type' => $eventType,
            'schedule_id' => $schedule->id,
            'actor_user_id' => $actor?->id,
            'technician_name' => $schedule->user?->name ?: '未指定師傅',
            'customer_source' => $source,
            'contact_name' => $contactName,
            'service_area' => $schedule->service_area,
            'ac_units' => (int) $schedule->ac_units,
            'amount' => (int) $schedule->cleaning_price,
            'work_date' => $workDate,
            'previous_work_date' => $previousWorkDate,
        ]);
    }
}
