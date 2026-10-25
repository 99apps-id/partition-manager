import { useState, useEffect } from 'react'

declare global {
  interface Window {
    __TAURI__?: {
      appWindow?: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        toggleMaximize: () => Promise<void>
        close: () => Promise<void>
        isMaximized: () => Promise<boolean>
      }
    }
  }
}

export default function TitleBar() {
  const [isTauri, setIsTauri] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const hasTauri = typeof window !== 'undefined' && !!window.__TAURI__?.appWindow
    setIsTauri(hasTauri)
    if (hasTauri) {
      window.__TAURI__!.appWindow!.isMaximized().then(setIsMaximized).catch(() => {})
    }
  }, [])

  if (!isTauri) return null

  const handleMinimize = async () => {
    await window.__TAURI__!.appWindow!.minimize()
  }

  const handleMaximize = async () => {
    await window.__TAURI__!.appWindow!.toggleMaximize()
    const maximized = await window.__TAURI__!.appWindow!.isMaximized()
    setIsMaximized(maximized)
  }

  const handleClose = async () => {
    await window.__TAURI__!.appWindow!.close()
  }

  return (
    <div
      className="h-8 bg-white border-b border-slate-200 flex items-center justify-between select-none shrink-0"
      style={{
        WebkitAppRegion: 'drag',
        appRegion: 'drag',
      } as React.CSSProperties}
    >
      <div className="flex-1 h-full flex items-center px-3 text-[12px] font-medium text-slate-600">
        Partition Manager
      </div>

      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="w-[46px] h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="w-[46px] h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1" fill="none" />
              <path d="M2 4h6M4 2v6" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          className="w-[46px] h-full flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
