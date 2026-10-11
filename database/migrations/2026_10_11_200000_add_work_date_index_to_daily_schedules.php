<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_schedules', function (Blueprint $table) {
            $table->index('work_date', 'daily_schedules_work_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('daily_schedules', function (Blueprint $table) {
            $table->dropIndex('daily_schedules_work_date_index');
        });
    }
};
