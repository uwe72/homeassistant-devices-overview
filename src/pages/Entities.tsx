import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import IntegrationsTable from '../components/IntegrationsTable'
import BatteryTable from '../components/BatteryTable'

const STORAGE_KEY = 'entities_active_tab'

type TabId = 'geraete' | 'batterie'

const TABS: { id: TabId; label: string }[] = [
  { id: 'geraete', label: 'Geräte' },
  { id: 'batterie', label: 'Batterie' },
]

export default function Entities() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'batterie') return 'batterie'
    if (searchParams.has('entity_id')) return 'geraete'
    return (localStorage.getItem(STORAGE_KEY) as TabId) || 'geraete'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab)
  }, [activeTab])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex gap-1 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#2c2c2e] text-[#00A5CB] border-[#3c3c3e]'
                : 'bg-[#1c1c1e] text-[#9a9a9a] border-[#2c2c2e] hover:text-[#00A5CB]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {activeTab === 'geraete' ? <IntegrationsTable /> : <BatteryTable />}
      </div>
    </div>
  )
}
