import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom'
import { useHA } from '../context/HAContext'

export default function Layout() {
  const { isConnected, disconnect, credentials } = useHA()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Geräte' },
    { path: '/batteries', label: 'Batterien' },
    { path: '/entities', label: 'Entitäten' },
    { path: '/statistics', label: 'Statistiken' }
  ]

  return (
    <div className="h-screen flex flex-col bg-[#1c1c1e]">
      <header className="flex-shrink-0 bg-[#1c1c1e] border-b border-[#2c2c2e] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <RouterLink to="/" className="flex items-center gap-3">
              <svg width="44" height="44" viewBox="0 0 44 44" className="drop-shadow-lg">
                <circle cx="22" cy="22" r="20" fill="#00A5CB"/>
                <circle cx="22" cy="22" r="18" fill="none" stroke="#1c1c1e" strokeWidth="2"/>
                <path d="M22 10 L22 34" stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round"/>
                <path d="M10 22 L34 22" stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="22" cy="22" r="4" fill="#1c1c1e"/>
              </svg>
              <span className="text-xl font-bold text-[#00A5CB]">
                HA Device Manager
              </span>
              {import.meta.env.VITE_APP_VERSION && (
                <span className="text-xs bg-[#2c2c2e] text-[#9a9a9a] px-2 py-0.5 rounded ml-2">
                  {import.meta.env.VITE_APP_VERSION}
                </span>
              )}
            </RouterLink>

            {isConnected && (
              <nav className="flex gap-6">
                {navItems.map(item => (
                  <RouterLink
                    key={item.path}
                    to={item.path}
                    className={`transition-colors ${
                      location.pathname === item.path
                        ? 'text-[#00A5CB] font-medium'
                        : 'text-[#9a9a9a] hover:text-[#00A5CB]'
                    }`}
                  >
                    {item.label}
                  </RouterLink>
                ))}
              </nav>
            )}

            <div className="flex items-center gap-4">
              {isConnected && (
                <>
                  <span className="text-sm text-[#9a9a9a]">
                    Verbunden mit {credentials?.url}
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-1 text-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] border border-[#3c3c3e] rounded text-[#ffffff] transition-colors"
                  >
                    Trennen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
