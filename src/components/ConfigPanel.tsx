import { useState } from 'react'
import { useHA } from '../context/HAContext'

export default function ConfigPanel() {
  const { connect, isLoading, error } = useHA()
  const [url, setUrl] = useState(localStorage.getItem('ha_url') || '')
  const [token, setToken] = useState(localStorage.getItem('ha_token') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url && token) {
      connect({ url, token })
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center">
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-8 max-w-lg w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="#00A5CB"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#1c1c1e" strokeWidth="2"/>
            <path d="M22 10 L22 34" stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round"/>
            <path d="M10 22 L34 22" stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="22" cy="22" r="4" fill="#1c1c1e"/>
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-[#00A5CB]">HA Device Manager</h1>
            <p className="text-sm text-[#4a4a4a]">Home Assistant Geräteverwaltung</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9a9a9a] mb-2">
              Home Assistant URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-ha-instance.com"
              className="w-full px-4 py-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] placeholder-[#4a4a4a] focus:outline-none focus:border-[#00A5CB]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#9a9a9a] mb-2">
              Long-Lived Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Dein Access Token"
              className="w-full px-4 py-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] placeholder-[#4a4a4a] focus:outline-none focus:border-[#00A5CB]"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-[#3D0606] border border-[#FF453A] rounded-lg text-[#FF453A] text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !url || !token}
            className="w-full py-2 px-4 bg-[#00A5CB] hover:bg-[#3a9bff] text-[#ffffff] font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verbinde...' : 'Verbinden'}
          </button>
        </form>

        <div className="mt-6 text-xs text-[#4a4a4a]">
          <p>Token erstellen: Home Assistant → Profil → Sicherheit → Long-Lived Access Tokens</p>
        </div>
      </div>
    </div>
  )
}
