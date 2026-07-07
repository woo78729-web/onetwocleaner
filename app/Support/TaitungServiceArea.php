<?php

namespace App\Support;

class TaitungServiceArea
{
    /**
     * @return array<string, string>
     */
    public static function options(): array
    {
        return [
            'zuoying' => '左營',
            'gushan' => '鼓山',
            'sanmin' => '三民',
            'nanzi' => '楠梓',
            'xinxing' => '新興',
            'qianjin' => '前金',
            'yancheng' => '鹽埕',
            'lingya' => '苓雅',
            'qianzhen' => '前鎮',
            'xiaogang' => '小港',
            'niaosong' => '鳥松',
            'renwu' => '仁武',
            'dashe' => '大社',
            'fengshan' => '鳳山',
            'gangshan' => '岡山',
            'qiaotou' => '橋頭',
            // 舊台東資料相容（僅供顯示／查詢既有紀錄）
            'taitung_city' => '台東市',
            'beinan' => '卑南',
            'luye' => '鹿野',
            'guanshan' => '關山',
            'haiduan' => '海端',
            'yanping' => '延平',
            'donghe' => '東河',
            'chenggong' => '成功',
            'changbin' => '長濱',
            'chishang' => '池上',
            'taimali' => '太麻里',
            'dawu' => '大武',
            'daren' => '達仁',
            'jinfeng' => '金峰',
            'ludao' => '綠島',
            'lanyu' => '蘭嶼',
        ];
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        $legacy = [
            'taitung_city',
            'beinan',
            'luye',
            'guanshan',
            'haiduan',
            'yanping',
            'donghe',
            'chenggong',
            'changbin',
            'chishang',
            'taimali',
            'dawu',
            'daren',
            'jinfeng',
            'ludao',
            'lanyu',
        ];

        return array_values(array_filter(
            array_keys(self::options()),
            fn (string $value) => ! in_array($value, $legacy, true)
        ));
    }

    public static function label(?string $value): string
    {
        if (! $value) {
            return '未設定';
        }

        return self::options()[$value] ?? $value;
    }
}
