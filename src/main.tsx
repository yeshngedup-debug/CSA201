import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const App = lazy(() => import('./App'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}><span className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: "var(--color-text-soft)", fontFamily: "var(--font-display)" }}>Loading Teru Care</span></div>}>
      <App />
    </Suspense>
  </React.StrictMode>,
)
