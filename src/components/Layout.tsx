import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom'
import { useHA } from '../context/HAContext'

export default function Layout() {
  const { isConnected, disconnect, credentials } = useHA()
  const location = useLocation()

  const navItems = [
    { path: '/devices', label: 'Geräte' },
    { path: '/batteries', label: 'Batterien' },
    { path: '/entities', label: 'Entitäten' },
    { path: '/statistics', label: 'Statistiken' }
  ]

  return (
    <div className="h-screen flex flex-col bg-[#1c1c1e]">
      <header className="flex-shrink-0 bg-[#1c1c1e] border-b border-[#2c2c2e] shadow-lg">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <RouterLink to="/" className="flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-lg">
                  <rect x="2" y="2" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="9" y="2" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="16" y="2" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="2" y="9" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="9" y="9" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="16" y="9" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="2" y="16" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="9" y="16" width="6" height="6" rx="1" fill="#00A5CB"/>
                  <rect x="16" y="16" width="6" height="6" rx="1" fill="#00A5CB"/>
                </svg>
                <span className="text-xl font-bold text-[#00A5CB]">
                  HA Device Manager
                </span>
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
            </div>

            <div className="flex items-center gap-4">
              {isConnected && (
                <>
                  <span className="text-sm text-[#9a9a9a]">
                    {credentials?.url}
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-1 text-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] border border-[#3c3c3e] rounded text-[#ffffff] transition-colors"
                  >
                    Trennen
                  </button>
                </>
              )}
              {import.meta.env.VITE_APP_VERSION && (
                <a
                  href="https://github.com/uwe72/homeassistant-devices-overview/actions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-[#2c2c2e] text-[#9a9a9a] px-2 py-0.5 rounded hover:text-[#00A5CB] transition-colors"
                >
                  {import.meta.env.VITE_APP_VERSION}
                </a>
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
