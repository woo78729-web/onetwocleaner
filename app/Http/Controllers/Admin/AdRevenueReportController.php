<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\AdRevenueReportSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdRevenueReportController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'week_start' => ['nullable', 'date'],
            'basis' => ['nullable', 'string', Rule::in(AdRevenueReportSupport::bases())],
            'weeks' => ['nullable', 'integer', 'min:1', 'max:52'],
        ]);

        $report = AdRevenueReportSupport::build(
            $validated['week_start'] ?? null,
            $validated['basis'] ?? AdRevenueReportSupport::BASIS_SCHEDULED_AT,
            (int) ($validated['weeks'] ?? AdRevenueReportSupport::DEFAULT_WEEKS),
        );

        return $this->success($report, '廣告收益回報查詢成功');
    }
}
