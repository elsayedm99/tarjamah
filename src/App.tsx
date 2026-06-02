// ─────────────────────────────────────────────────────────────
// Tarjama — App Root
// ─────────────────────────────────────────────────────────────

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useSettingsStore } from './store/settingsStore';
import { THEME } from './utils/constants';

// ── Lazy-loaded Pages with auto-refresh on stale chunks ─────
// After a new Vercel deploy, old chunk URLs 404. This catches
// that and refreshes the page once to load the new chunks.

function lazyWithRefresh<T extends { default: React.ComponentType }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      // Only refresh once to avoid infinite loops
      const hasRefreshed = sessionStorage.getItem('chunk-refresh');
      if (!hasRefreshed) {
        sessionStorage.setItem('chunk-refresh', '1');
        window.location.reload();
      }
      // Return a no-op component if we already refreshed
      return { default: (() => null) as unknown as T['default'] };
    }) as Promise<T>,
  );
}

const UploadPage = lazyWithRefresh(() => import('./pages/UploadPage'));
const WorkspacePage = lazyWithRefresh(() => import('./pages/WorkspacePage'));

// ── Loading Spinner ─────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner" />
      <p className="loading-spinner-text">Loading…</p>
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  // Apply CSS custom properties to :root whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    const vars = THEME[theme];

    Object.entries(vars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Also set a data attribute for conditional CSS selectors
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className={`app-root theme-${theme}`}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/project/:id" element={<WorkspacePage />} />
          </Routes>
        </Suspense>

        <Toaster
          position="bottom-right"
          theme={theme}
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "'Inter', sans-serif",
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}
