<?php

namespace Tests\Feature\Api;

use App\Models\EmployeeLeave;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Support\CreatesScheduleTestData;
use Tests\TestCase;

class EmployeeLeaveReminderApiTest extends TestCase
{
    use CreatesScheduleTestData;
    use RefreshDatabase;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = User::query()->create([
            'account' => 'emp1',
            'password' => Hash::make('password123'),
            'name' => '員工',
            'role' => 'employee',
            'is_active' => true,
            'rules_accepted_at' => now()->subMonths(2),
            'must_change_password' => false,
        ]);
        $this->employee->forceFill([
            'created_at' => now()->subMonths(2),
            'updated_at' => now()->subMonths(2),
        ])->save();
    }

    public function test_employee_sees_leave_reminder_during_window_until_scheduled(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 21, 10, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->employee);

        $this->getJson('/api/employee/leave-reminder')
            ->assertOk()
            ->assertJsonPath('data.should_show', true)
            ->assertJsonPath('data.target_month', '2026-12')
            ->assertJsonPath('data.has_scheduled', false);

        $this->postJson('/api/employee/leaves', [
            'leave_type' => EmployeeLeave::TYPE_DATE,
            'leave_date' => '2026-12-05',
        ])->assertCreated();

        $this->getJson('/api/employee/leave-reminder')
            ->assertOk()
            ->assertJsonPath('data.should_show', false)
            ->assertJsonPath('data.has_scheduled', true);

        Carbon::setTestNow();
    }

    public function test_employee_can_acknowledge_leave_reminder_without_dates(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 22, 10, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->employee);

        $this->postJson('/api/employee/leave-reminder/ack', [
            'year_month' => '2026-12',
        ])
            ->assertOk()
            ->assertJsonPath('data.should_show', false)
            ->assertJsonPath('data.has_scheduled', true);

        $this->getJson('/api/employee/leave-reminder')
            ->assertOk()
            ->assertJsonPath('data.should_show', false);

        Carbon::setTestNow();
    }

    public function test_leave_reminder_hidden_outside_window(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Taipei'));
        Sanctum::actingAs($this->employee);

        $this->getJson('/api/employee/leave-reminder')
            ->assertOk()
            ->assertJsonPath('data.should_show', false)
            ->assertJsonPath('data.registration_open', false);

        Carbon::setTestNow();
    }
}
