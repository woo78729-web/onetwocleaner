/**
 * Vite/SPA deployments change hashed chunk filenames.
 * If the browser still holds an old entry bundle, dynamic imports 404.
 * Reload once to pick up the fresh index.html.
 */
export function lazyRetry(factory) {
  return async () => {
    try {
      const module = await factory();
      sessionStorage.removeItem('spa-chunk-reload');
      return module;
    } catch (error) {
      const message = String(error?.message || error || '');
      const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed/i
        .test(message);

      if (isChunkError && sessionStorage.getItem('spa-chunk-reload') !== '1') {
        sessionStorage.setItem('spa-chunk-reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }

      sessionStorage.removeItem('spa-chunk-reload');
      throw error;
    }
  };
}
