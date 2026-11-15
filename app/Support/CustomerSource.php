<?php

namespace App\Support;

class CustomerSource
{
    public const FB = 'fb';

    public const FB_AD = 'fb_ad';

    public const LINE = 'line';

    public const PHONE = 'phone';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return [self::FB, self::FB_AD, self::LINE, self::PHONE];
    }

    public static function label(string $source): string
    {
        return match ($source) {
            self::FB => 'FB',
            self::FB_AD => 'FB廣告',
            self::LINE => 'LINE',
            self::PHONE => '電聯',
            default => $source,
        };
    }

    public static function isFacebookFamily(string $source): bool
    {
        return in_array($source, [self::FB, self::FB_AD], true);
    }
}
