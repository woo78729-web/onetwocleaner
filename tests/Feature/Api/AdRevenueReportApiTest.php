<?php

namespace Tests\Feature\Api;

use App\Models\DailySchedule;
use App\Models\User;
use App\Support\CustomerSource;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Support\CreatesScheduleTestData;
use Tests\TestCase;

class AdRevenueReportApiTest extends TestCase
{
    use CreatesScheduleTestData;
    use RefreshDatabase;

    private User $admin;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::query()->create([
            'account' => 'admin1',
            'password' => Hash::make('password123'),
            'name' => '管理員',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->employee = User::query()->create([
            'account' => 'emp1',
            'password' => Hash::make('password123'),
            'name' => '員工',
            'role' => 'employee',
            'is_active' => true,
            'rules_accepted_at' => now(),
            'must_change_password' => false,
        ]);
    }

    public function test_ad_revenue_report_only_counts_fb_ad_by_created_at(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 11, 12, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->admin);

        $inWeek = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-20',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 3000,
        ]));
        $inWeek->forceFill(['created_at' => '2026-11-10 09:30:00'])->save();

        $sameWeek = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-21',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 1500,
        ]));
        $sameWeek->forceFill(['created_at' => '2026-11-12 14:00:00'])->save();

        $outWeek = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-12',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 9000,
        ]));
        $outWeek->forceFill(['created_at' => '2026-11-03 09:30:00'])->save();

        // 一般 FB／電聯不應計入廣告收益
        DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-12',
            'customer_source' => CustomerSource::FB,
            'cleaning_price' => 5000,
        ]))->forceFill(['created_at' => '2026-11-10 10:00:00'])->save();

        DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-12',
            'customer_source' => CustomerSource::PHONE,
            'cleaning_price' => 2000,
        ]))->forceFill(['created_at' => '2026-11-10 10:00:00'])->save();

        $response = $this->getJson('/api/admin/ad-revenue-report?week_start=2026-11-10&weeks=2')
            ->assertOk()
            ->assertJsonPath('data.basis', 'scheduled_at')
            ->assertJsonCount(2, 'data.weeks');

        $weeks = collect($response->json('data.weeks'));
        $current = $weeks->firstWhere('week_start', '2026-11-08');
        $previous = $weeks->firstWhere('week_start', '2026-11-01');

        $this->assertNotNull($current);
        $this->assertSame('1108-1114', $current['label']);
        $this->assertSame(2, $current['orders_received']);
        $this->assertSame(4500, $current['deal_amount']);

        $this->assertNotNull($previous);
        $this->assertSame(1, $previous['orders_received']);
        $this->assertSame(9000, $previous['deal_amount']);

        Carbon::setTestNow();
    }

    public function test_ad_revenue_report_monthly_vendor_fee_is_five_percent(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 11, 12, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->admin);

        $novA = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-20',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 20000,
        ]));
        $novA->forceFill(['created_at' => '2026-11-10 09:00:00'])->save();

        $novB = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-21',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 8500,
        ]));
        $novB->forceFill(['created_at' => '2026-11-18 11:00:00'])->save();

        $oct = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-10-30',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 99999,
        ]));
        $oct->forceFill(['created_at' => '2026-10-28 09:00:00'])->save();

        $this->getJson('/api/admin/ad-revenue-report?year_month=2026-11&weeks=1')
            ->assertOk()
            ->assertJsonPath('data.monthly.year_month', '2026-11')
            ->assertJsonPath('data.monthly.orders_received', 2)
            ->assertJsonPath('data.monthly.deal_amount', 28500)
            ->assertJsonPath('data.monthly.vendor_fee_rate', 0.05)
            ->assertJsonPath('data.monthly.vendor_fee_amount', 1425);

        Carbon::setTestNow();
    }

    public function test_schedule_accepts_fb_ad_source(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/admin/schedules', $this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => now()->addDays(3)->toDateString(),
            'customer_source' => CustomerSource::FB_AD,
            'fb_display_name' => '廣告客戶',
            'cleaning_price' => 3000,
            'ac_units' => 2,
            'pricing_lines' => [
                ['ac_units' => 2, 'unit_price' => 1500],
            ],
            'task_details' => '2台3000',
        ]))
            ->assertCreated()
            ->assertJsonPath('data.customer_source', 'fb_ad');
    }
}
