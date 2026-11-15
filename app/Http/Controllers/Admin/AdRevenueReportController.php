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
            'year_month' => ['nullable', 'date_format:Y-m'],
        ]);

        $report = AdRevenueReportSupport::build(
            $validated['year_month'] ?? null,
        );

        return $this->success($report, '廣告收益回報查詢成功');
    }
}
