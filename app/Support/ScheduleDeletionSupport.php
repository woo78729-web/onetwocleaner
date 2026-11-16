<?php

namespace App\Support;

use App\Models\CompanyRemittance;
use App\Models\DailySchedule;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ScheduleDeletionSupport
{
    public static function deleteWithDependents(DailySchedule $schedule, ?User $actor = null): void
    {
        $actor ??= Auth::user();
        ScheduleAnnouncementSupport::recordCancel($schedule, $actor);

        $report = $schedule->dailyReport;

        if ($report) {
            CompanyRemittance::query()->where('report_id', $report->id)->delete();
            $report->delete();
        }

        $schedule->delete();
    }
}
