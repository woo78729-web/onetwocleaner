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
            // 高雄（38 區）
            'zuoying' => '左營',
            'gushan' => '鼓山',
            'sanmin' => '三民',
            'nanzi' => '楠梓',
            'xinxing' => '新興',
            'qianjin' => '前金',
            'yancheng' => '鹽埕',
            'lingya' => '苓雅',
            'qianzhen' => '前鎮',
            'qijin' => '旗津',
            'xiaogang' => '小港',
            'fengshan' => '鳳山',
            'niaosong' => '鳥松',
            'renwu' => '仁武',
            'dashe' => '大社',
            'dashu' => '大樹',
            'daliao' => '大寮',
            'linyuan' => '林園',
            'gangshan' => '岡山',
            'qiaotou' => '橋頭',
            'yanchao' => '燕巢',
            'tianliao' => '田寮',
            'alian' => '阿蓮',
            'luzhu' => '路竹',
            'hunei' => '湖內',
            'qieding' => '茄萣',
            'yongan' => '永安',
            'mituo' => '彌陀',
            'ziguan' => '梓官',
            'qishan' => '旗山',
            'meinong' => '美濃',
            'liugui' => '六龜',
            'jiaxian' => '甲仙',
            'shanlin' => '杉林',
            'neimen' => '內門',
            'maolin' => '茂林',
            'taoyuan_kh' => '桃源',
            'namasia' => '那瑪夏',
            // 屏東（33 鄉鎮市）
            'pingtung_city' => '屏東市',
            'jiuru' => '九如',
            'ligang' => '里港',
            'gaoshu' => '高樹',
            'yanpu' => '鹽埔',
            'neipu' => '內埔',
            'zhutian' => '竹田',
            'changzhi' => '長治',
            'linluo' => '麟洛',
            'wandan' => '萬丹',
            'chaozhou' => '潮州',
            'wanluan' => '萬巒',
            'xinpi' => '新埤',
            'donggang' => '東港',
            'xinyuan' => '新園',
            'kanding' => '崁頂',
            'linbian' => '林邊',
            'nanzhou' => '南州',
            'jiadong' => '佳冬',
            'liuqiu' => '琉球',
            'fangliao' => '枋寮',
            'fangshan' => '枋山',
            'checheng' => '車城',
            'manzhou' => '滿州',
            'hengchun' => '恆春',
            'mudan' => '牡丹',
            'sandimen' => '三地門',
            'wutai' => '霧台',
            'majia' => '瑪家',
            'taiwu' => '泰武',
            'laiyi' => '來義',
            'chunri' => '春日',
            'shizi' => '獅子',
            // 台南
            'tainan_westcentral' => '中西區',
            'tainan_north' => '北區',
            'tainan_east' => '東區',
            'tainan_south' => '南區',
            'anping' => '安平',
            'annan' => '安南',
            'yongkang' => '永康',
            'rende' => '仁德',
            'guiren' => '歸仁',
            'xinhua' => '新化',
            'shanhua' => '善化',
            'xinshi' => '新市',
            'anding' => '安定',
            'madou' => '麻豆',
            'xinying' => '新營',
            'yanshui' => '鹽水',
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
