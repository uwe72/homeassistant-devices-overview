import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom'
import { useHA } from '../context/HAContext'

export default function Layout() {
  const { isConnected, disconnect, credentials } = useHA()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Geräteübersicht' },
    { path: '/hue', label: 'Philips Hue' },
    { path: '/statistics', label: 'Statistiken' }
  ]

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a2028] border-b border-[#2d3748] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <RouterLink to="/" className="flex items-center gap-3">
              <svg width="44" height="44" viewBox="0 0 44 44" className="drop-shadow-lg">
                <circle cx="22" cy="22" r="20" fill="#4fc3f7"/>
                <circle cx="22" cy="22" r="18" fill="none" stroke="#0f1419" strokeWidth="2"/>
                <path d="M22 10 L22 34" stroke="#0f1419" strokeWidth="3" strokeLinecap="round"/>
                <path d="M10 22 L34 22" stroke="#0f1419" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="22" cy="22" r="4" fill="#0f1419"/>
              </svg>
              <span className="text-xl font-bold text-[#4fc3f7]">
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
                        ? 'text-[#4fc3f7] font-medium'
                        : 'text-[#a0aec0] hover:text-[#4fc3f7]'
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
                  <span className="text-sm text-[#a0aec0]">
                    Verbunden mit {credentials?.url}
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-1 text-sm bg-[#242d38] hover:bg-[#2d3748] border border-[#3d4a5c] rounded text-[#f5f5f5] transition-colors"
                  >
                    Trennen
                  </button>
                  <button
                    onClick={() => {
                      const url = localStorage.getItem('ha_url')
                      if (url) {
                        window.open(url + '/config/entities', '_blank')
                      }
                    }}
                    className="px-3 py-1 text-sm bg-[#242d38] hover:bg-[#2d3748] border border-[#3d4a5c] rounded text-[#f5f5f5] transition-colors"
                  >
                    HA öffnen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 pt-20">
        <Outlet />
      </main>
    </div>
  )
}
