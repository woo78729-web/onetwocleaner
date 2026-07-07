<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('fund_accounts')
            ->where('code', 'dongdong')
            ->update([
                'name' => '萬兔帳',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('fund_accounts')
            ->where('code', 'dongdong')
            ->update([
                'name' => '東東帳',
                'updated_at' => now(),
            ]);
    }
};
