import { Component } from 'react';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed/i
    .test(message);
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error)) {
      return;
    }

    if (sessionStorage.getItem('spa-chunk-reload') === '1') {
      return;
    }

    sessionStorage.setItem('spa-chunk-reload', '1');
    window.location.reload();
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <div className="app-shell__content page-content">
            <section className="card page-error-boundary__card">
              <h2 className="card-title">頁面載入失敗</h2>
              <p className="hint">請重新整理頁面；若仍失敗，請清除瀏覽器快取後再試。</p>
              <p className="hint">{this.state.error?.message || '未知錯誤'}</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  sessionStorage.removeItem('spa-chunk-reload');
                  window.location.reload();
                }}
              >
                重新整理
              </button>
            </section>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AuthLoadingScreen({ message = '載入中...' }) {
  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-shell__content page-content">
        <div className="card auth-loading-card">
          <p className="hint">{message}</p>
        </div>
      </div>
    </div>
  );
}
