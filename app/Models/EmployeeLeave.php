<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeLeave extends Model
{
    public const TYPE_DATE = 'date';

    public const TYPE_WEEKLY = 'weekly';

    public const DEFAULT_START_TIME = '09:00';

    public const DEFAULT_END_TIME = '21:00';

    protected $fillable = [
        'user_id',
        'leave_type',
        'leave_date',
        'start_time',
        'end_time',
        'weekday',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'leave_date' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * 僅啟用中員工的休假（停用／離職者不顯示於排班行事曆）
     *
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\EmployeeLeave>  $query
     * @return \Illuminate\Database\Eloquent\Builder<\App\Models\EmployeeLeave>
     */
    public function scopeForActiveEmployees($query)
    {
        return $query->whereHas('user', function ($builder) {
            $builder->where('is_active', true);
        });
    }
}
