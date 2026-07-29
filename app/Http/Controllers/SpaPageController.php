<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class SpaPageController extends Controller
{
    public function index(): Response
    {
        return $this->indexResponse();
    }

    public function path(?string $path = null): Response
    {
        $spaRoot = public_path('spa');

        if ($path) {
            $normalized = ltrim(str_replace('\\', '/', $path), '/');

            // Prevent path traversal outside /public/spa.
            if ($normalized === '' || str_contains($normalized, '..')) {
                return $this->indexResponse();
            }

            $assetPath = $spaRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $normalized);

            if (File::isFile($assetPath)) {
                return $this->assetResponse($assetPath, $normalized);
            }

            // Missing hashed assets must 404. Returning index.html here makes the
            // browser treat HTML as JS and show "Failed to fetch dynamically imported module".
            if ($this->looksLikeStaticAsset($normalized)) {
                return response('Not Found', 404);
            }
        }

        return $this->indexResponse();
    }

    private function indexResponse(): Response
    {
        $indexPath = public_path('spa/index.html');

        if (! File::isFile($indexPath)) {
            return response(
                '前端尚未建置，請在專案根目錄執行：cd web-app && npm install && npm run build',
                503
            );
        }

        return response()->file($indexPath, [
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    private function assetResponse(string $assetPath, string $normalizedPath): BinaryFileResponse
    {
        $headers = [
            'Cache-Control' => $this->looksLikeHashedAsset($normalizedPath)
                ? 'public, max-age=31536000, immutable'
                : 'public, max-age=3600',
        ];

        return response()->file($assetPath, $headers);
    }

    private function looksLikeStaticAsset(string $path): bool
    {
        return (bool) preg_match('/\.(js|mjs|css|map|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|txt)$/i', $path);
    }

    private function looksLikeHashedAsset(string $path): bool
    {
        return (bool) preg_match('/[-_.][A-Za-z0-9]{6,}\.(js|mjs|css)$/', $path)
            || str_starts_with($path, 'assets/');
    }
}
