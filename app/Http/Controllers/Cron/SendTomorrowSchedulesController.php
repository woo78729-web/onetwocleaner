<?php

namespace App\Http\Controllers\Cron;

use App\Http\Controllers\Controller;
use App\Support\TomorrowSchedulePushSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendTomorrowSchedulesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        if (! $this->authorized($request)) {
            return $this->error('Unauthorized cron token', 401);
        }

        $dryRun = $request->boolean('dry_run');

        try {
            $result = TomorrowSchedulePushSupport::send(dryRun: $dryRun);
        } catch (Throwable $e) {
            Log::error('Tomorrow schedule push crashed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return $this->error('明日班表推播發生錯誤：'.$e->getMessage(), 500);
        }

        $failed = (int) ($result['failed'] ?? 0);
        $hasLineToken = (string) config('services.line.channel_access_token') !== '';

        return $this->success([
            'dry_run' => $dryRun,
            'line_token_configured' => $hasLineToken,
            'result' => $result,
        ], $failed > 0 ? '明日班表推播執行完成（含失敗）' : '明日班表推播已執行');
    }

    private function authorized(Request $request): bool
    {
        $secret = (string) config('services.cron.secret');

        if ($secret === '') {
            return false;
        }

        $candidates = [
            (string) $request->bearerToken(),
            (string) $request->header('X-Cron-Secret', ''),
            (string) $request->query('token', ''),
            (string) $request->input('token', ''),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate !== '' && hash_equals($secret, $candidate)) {
                return true;
            }
        }

        return false;
    }
}
