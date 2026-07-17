import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X, WifiOff } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function ReloadPrompt() {
  const { dark } = useTheme()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ', r)
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className={`fixed right-4 bottom-4 z-50 max-w-sm rounded-2xl border p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
      dark ? 'bg-slate-950/90 border-slate-800 text-white shadow-black/40' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
          {offlineReady ? (
            <WifiOff className="h-5 w-5" />
          ) : (
            <RefreshCw className="h-5 w-5 animate-spin duration-1000" style={{ animationDuration: '3s' }} />
          )}
        </div>
        
        <div className="flex-1 space-y-1">
          <h4 className={`font-semibold text-sm ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
            {offlineReady ? 'Ready to play offline' : 'Update available'}
          </h4>
          <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {offlineReady
              ? 'QuickPlay Zone is now ready to run offline without internet access.'
              : 'A new version of the gaming zone is available. Reload to get latest games and updates.'}
          </p>
          
          <div className="mt-3 flex items-center gap-2">
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-violet-500 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload & Update
              </button>
            )}
            <button
              onClick={close}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                dark 
                  ? 'border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200' 
                  : 'border-slate-250 text-slate-600 hover:bg-slate-105 hover:text-slate-900'
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={close}
          className={`rounded-lg p-1 transition-colors cursor-pointer ${
            dark ? 'text-slate-505 hover:bg-slate-900 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-105 hover:text-slate-700'
          }`}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

