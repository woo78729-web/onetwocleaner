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

    public function test_ad_revenue_report_only_shows_selected_month_weeks(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 11, 12, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->admin);

        $weekA = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-20',
            'customer_name' => '客戶A',
            'customer_phone' => '0911111111',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 3000,
        ]));
        $weekA->forceFill(['created_at' => '2026-11-10 09:30:00'])->save();

        $weekB = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-21',
            'customer_name' => '客戶B',
            'customer_phone' => '0922222222',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 1500,
        ]));
        $weekB->forceFill(['created_at' => '2026-11-12 14:00:00'])->save();

        $earlierInMonth = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-05',
            'customer_name' => '客戶C',
            'customer_phone' => '0933333333',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 9000,
        ]));
        $earlierInMonth->forceFill(['created_at' => '2026-11-03 09:30:00'])->save();

        // 上月不應出現在 11 月週次
        DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-10-30',
            'customer_name' => '上月客戶',
            'customer_phone' => '0944444444',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 99999,
        ]))->forceFill(['created_at' => '2026-10-28 09:00:00'])->save();

        // 一般 FB 不計入
        DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-12',
            'customer_name' => '一般FB',
            'customer_phone' => '0955555555',
            'customer_source' => CustomerSource::FB,
            'cleaning_price' => 5000,
        ]))->forceFill(['created_at' => '2026-11-10 10:00:00'])->save();

        $response = $this->getJson('/api/admin/ad-revenue-report?year_month=2026-11')
            ->assertOk()
            ->assertJsonPath('data.basis', 'created_at')
            ->assertJsonPath('data.monthly.year_month', '2026-11')
            ->assertJsonPath('data.monthly.orders_received', 3)
            ->assertJsonPath('data.monthly.deal_amount', 13500)
            ->assertJsonPath('data.monthly.vendor_fee_amount', 675);

        $weeks = collect($response->json('data.weeks'));
        $this->assertTrue($weeks->every(fn (array $week) => str_starts_with($week['week_start'], '2026-11')));
        $this->assertSame(['1101-1107', '1108-1114', '1115-1121', '1122-1128', '1129-1205'], $weeks->pluck('label')->all());

        $this->assertSame(1, $weeks->firstWhere('label', '1101-1107')['orders_received']);
        $this->assertSame(9000, $weeks->firstWhere('label', '1101-1107')['deal_amount']);
        $this->assertSame(2, $weeks->firstWhere('label', '1108-1114')['orders_received']);
        $this->assertSame(4500, $weeks->firstWhere('label', '1108-1114')['deal_amount']);

        Carbon::setTestNow();
    }

    public function test_ad_revenue_counts_deals_not_units_and_ignores_work_date_changes(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 11, 12, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->admin);

        $schedule = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-10',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 4500,
            'ac_units' => 3,
            'pricing_lines' => [
                ['ac_units' => 3, 'unit_price' => 1500],
            ],
            'task_details' => '3台4500',
        ]));
        $schedule->forceFill(['created_at' => '2026-11-10 09:30:00'])->save();

        $before = $this->getJson('/api/admin/ad-revenue-report?year_month=2026-11')->assertOk();
        $beforeWeek = collect($before->json('data.weeks'))->firstWhere('label', '1108-1114');
        $this->assertSame(1, $beforeWeek['orders_received']);
        $this->assertSame(4500, $beforeWeek['deal_amount']);

        $this->patchJson('/api/admin/schedules/'.$schedule->id, [
            'work_date' => '2026-11-25',
        ])->assertOk();

        $after = $this->getJson('/api/admin/ad-revenue-report?year_month=2026-11')->assertOk();
        $weeks = collect($after->json('data.weeks'));
        $this->assertSame(1, $weeks->firstWhere('label', '1108-1114')['orders_received']);
        $this->assertSame(4500, $weeks->firstWhere('label', '1108-1114')['deal_amount']);
        $this->assertSame(0, $weeks->firstWhere('label', '1122-1128')['orders_received']);
        $this->assertSame(1, $after->json('data.monthly.orders_received'));

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

    public function test_ad_revenue_groups_same_name_and_phone_as_one_order(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 11, 12, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->admin);

        $first = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-12',
            'customer_name' => '王小明',
            'customer_phone' => '0912-345-678',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 3000,
            'ac_units' => 2,
        ]));
        $first->forceFill(['created_at' => '2026-11-10 09:00:00'])->save();

        $second = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-18',
            'customer_name' => '王 小明',
            'customer_phone' => '0912345678',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 1500,
            'ac_units' => 1,
        ]));
        $second->forceFill(['created_at' => '2026-11-12 11:00:00'])->save();

        $other = DailySchedule::query()->create($this->scheduleAttributes([
            'user_id' => $this->employee->id,
            'work_date' => '2026-11-13',
            'customer_name' => '李太太',
            'customer_phone' => '0987654321',
            'customer_source' => CustomerSource::FB_AD,
            'cleaning_price' => 4500,
            'ac_units' => 3,
        ]));
        $other->forceFill(['created_at' => '2026-11-11 15:00:00'])->save();

        $response = $this->getJson('/api/admin/ad-revenue-report?year_month=2026-11')
            ->assertOk()
            ->assertJsonPath('data.monthly.orders_received', 2)
            ->assertJsonPath('data.monthly.deal_amount', 9000);

        $weeks = collect($response->json('data.weeks'));
        $this->assertSame(2, $weeks->firstWhere('label', '1108-1114')['orders_received']);
        $this->assertSame(9000, $weeks->firstWhere('label', '1108-1114')['deal_amount']);

        Carbon::setTestNow();
    }
}
