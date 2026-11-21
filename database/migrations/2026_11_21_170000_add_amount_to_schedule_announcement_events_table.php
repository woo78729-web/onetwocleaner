<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_announcement_events', function (Blueprint $table) {
            $table->unsignedInteger('amount')->nullable()->after('ac_units');
        });
    }

    public function down(): void
    {
        Schema::table('schedule_announcement_events', function (Blueprint $table) {
            $table->dropColumn('amount');
        });
    }
};
