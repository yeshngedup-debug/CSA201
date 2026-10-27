import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const App = lazy(() => import('./App'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-ink text-white flex items-center justify-center"><span className="brand-accent px-4 py-2 rounded-xl text-sm font-semibold">Loading FinTrack</span></div>}>
      <App />
    </Suspense>
  </React.StrictMode>,
)
