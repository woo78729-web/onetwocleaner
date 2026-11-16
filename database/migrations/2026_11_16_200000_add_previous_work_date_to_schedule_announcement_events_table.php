<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_announcement_events', function (Blueprint $table) {
            $table->date('previous_work_date')->nullable()->after('work_date');
        });
    }

    public function down(): void
    {
        Schema::table('schedule_announcement_events', function (Blueprint $table) {
            $table->dropColumn('previous_work_date');
        });
    }
};
