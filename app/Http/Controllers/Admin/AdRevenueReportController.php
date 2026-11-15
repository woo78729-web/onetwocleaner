<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\AdRevenueReportSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdRevenueReportController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'week_start' => ['nullable', 'date'],
            'year_month' => ['nullable', 'date_format:Y-m'],
            'weeks' => ['nullable', 'integer', 'min:1', 'max:52'],
        ]);

        $report = AdRevenueReportSupport::build(
            $validated['week_start'] ?? null,
            (int) ($validated['weeks'] ?? AdRevenueReportSupport::DEFAULT_WEEKS),
            $validated['year_month'] ?? null,
        );

        return $this->success($report, '廣告收益回報查詢成功');
    }
}
