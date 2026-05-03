import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHA } from '../context/HAContext'
import FilterBar from './FilterBar'
import type { EntityData } from '../types'

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs ${online ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-[#30D158] shadow-[0_0_6px_rgba(48,209,88,0.4)]' : 'bg-[#FF453A] shadow-[0_0_6px_rgba(255,69,58,0.4)]'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

function BatteryLevelBar({ level }: { level: number | null }) {
  if (level === null) {
    return <span className="text-[#4a4a4a] text-xs">—</span>
  }

  const color = level >= 50 ? '#30D158' : level >= 10 ? '#FFD60A' : '#FF453A'
  const bgColor = level >= 50 ? 'bg-[#30D15820]' : level >= 10 ? 'bg-[#FFD60A20]' : 'bg-[#FF453A20]'

  return (
    <div className="flex items-center gap-2">
      <div className={`w-16 h-2 rounded-full ${bgColor} overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${level}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{level}%</span>
    </div>
  )
}

const INTEGRATION_COLORS: Record<string, { bg: string; text: string }> = {
  'Philips Hue': { bg: 'bg-[#00A5CB20]', text: 'text-[#00A5CB]' },
  'ZHA': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'Zigbee2MQTT': { bg: 'bg-[#30D15820]', text: 'text-[#30D158]' },
  'Shelly': { bg: 'bg-[#FF9F0A20]', text: 'text-[#FF9F0A]' },
  'ESPHome': { bg: 'bg-[#FFD60A20]', text: 'text-[#FFD60A]' },
  'Homematic IP': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'Gruppe': { bg: 'bg-[#4a4a4a20]', text: 'text-[#9a9a9a]' },
}

function getIntegrationColor(integration: string): { bg: string; text: string } {
  return INTEGRATION_COLORS[integration] || { bg: 'bg-[#00A5CB20]', text: 'text-[#00A5CB]' }
}

export default function BatteriesTable() {
  const navigate = useNavigate()
  const { allEntities, areas, floors, updateEntityName, batteriesFilters, batteriesSearch, batteriesSort, setBatteriesFilter, setBatteriesSearch, setBatteriesSort } = useHA()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const batteryEntities = useMemo(() => {
    return allEntities.filter(e => e.labels.includes('batterie_ja'))
  }, [allEntities])

  const availableFilters = useMemo(() => {
    const integrations = new Set<string>()
    const floorNames = new Set<string>()
    const areaNames = new Set<string>()

    batteryEntities.forEach(e => {
      if (e.integration) integrations.add(e.integration)
      if (e.floor !== '—') floorNames.add(e.floor)
      if (e.area !== '—') areaNames.add(e.area)
    })

    let filteredAreas: string[]
    if (batteriesFilters.floor === 'all') {
      filteredAreas = Array.from(areaNames).sort()
    } else {
      const selectedFloor = floors.find(f => f.name === batteriesFilters.floor)
      if (selectedFloor) {
        const areaIdsForFloor = new Set(
          areas.filter(a => a.floor_id === selectedFloor.floor_id).map(a => a.name)
        )
        filteredAreas = Array.from(areaNames).filter(name => areaIdsForFloor.has(name)).sort()
      } else {
        filteredAreas = Array.from(areaNames).sort()
      }
    }

    return {
      status: ['online', 'offline'],
      integration: Array.from(integrations).sort(),
      floor: Array.from(floorNames).sort(),
      area: filteredAreas
    }
  }, [batteryEntities, areas, floors, batteriesFilters.floor])

  const filteredEntities = useMemo(() => {
    return batteryEntities.filter(e => {
      const searchTerms = batteriesSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
      const matchSearch = searchTerms.length === 0 ||
        searchTerms.every(term =>
          e.friendly_name.toLowerCase().includes(term) ||
          e.entity_id.toLowerCase().includes(term) ||
          e.area.toLowerCase().includes(term)
        )

      const matchStatus = batteriesFilters.status === 'all' ||
        (batteriesFilters.status === 'online' ? e.online : !e.online)

      const matchIntegration = batteriesFilters.integration === 'all' || e.integration === batteriesFilters.integration
      const matchFloor = batteriesFilters.floor === 'all' || e.floor === batteriesFilters.floor
      const matchArea = batteriesFilters.area === 'all' || e.area === batteriesFilters.area
      return matchSearch && matchStatus && matchIntegration && matchFloor && matchArea
    }).sort((a, b) => {
      if (batteriesSort.field === 'batteryLevel') {
        const aVal = a.batteryLevel ?? 999
        const bVal = b.batteryLevel ?? 999
        return batteriesSort.direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      const va = String(a[batteriesSort.field as keyof EntityData] || '')
      const vb = String(b[batteriesSort.field as keyof EntityData] || '')
      const primarySort = batteriesSort.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      if (primarySort !== 0) return primarySort
      const nameA = String(a.friendly_name || '')
      const nameB = String(b.friendly_name || '')
      return nameA.localeCompare(nameB)
    })
  }, [batteryEntities, batteriesSearch, batteriesFilters, batteriesSort])

  const startEdit = (entity: EntityData) => {
    setEditingId(entity.entity_id)
    setEditValue(entity.friendly_name)
  }

  const saveEdit = async () => {
    if (editingId && editValue.trim()) {
      await updateEntityName(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const stats = {
    total: filteredEntities.length,
    online: filteredEntities.filter(e => e.online).length,
    offline: filteredEntities.filter(e => !e.online).length
  }

  const SortArrow = ({ field }: { field: string }) => (
    <span className={`ml-1 text-[10px] ${batteriesSort.field === field ? 'opacity-100 text-[#00A5CB]' : 'opacity-30'}`}>
      {batteriesSort.field === field ? (batteriesSort.direction === 'asc' ? '▲' : '▼') : '▲'}
    </span>
  )

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-shrink-0 flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#ffffff]">Batterien</h1>
        <select
          value={batteriesFilters.integration}
          onChange={(e) => setBatteriesFilter('integration', e.target.value)}
          className="px-3 py-2 text-xs bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#00A5CB] min-w-[140px]"
        >
          <option value="all">Alle Integrationen</option>
          {availableFilters.integration.map(integration => (
            <option key={integration} value={integration}>{integration}</option>
          ))}
        </select>
        <div className="flex gap-4 text-sm">
          <span className="text-[#9a9a9a]">Gesamt: <span className="text-[#00A5CB] font-semibold">{stats.total}</span></span>
          <span className="text-[#9a9a9a]">Online: <span className="text-[#30D158] font-semibold">{stats.online}</span></span>
          <span className="text-[#9a9a9a]">Offline: <span className="text-[#FF453A] font-semibold">{stats.offline}</span></span>
        </div>
        <input
          type="text"
          value={batteriesSearch}
          onChange={(e) => setBatteriesSearch(e.target.value)}
          placeholder="Suchen (mehrere Begriffe mit Leerzeichen = UND)"
          className="flex-1 px-4 py-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] placeholder-[#4a4a4a] focus:outline-none focus:border-[#00A5CB]"
        />
      </div>

      <div className="flex-shrink-0">
        <FilterBar
          filters={batteriesFilters}
          availableFilters={availableFilters}
          onFilterChange={setBatteriesFilter}
          excludeFilters={['integration']}
        />
      </div>

      <div className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1c1c1e] border-b border-[#2c2c2e]">
                {[
                  { key: 'integration', label: 'Integration' },
                  { key: 'online', label: 'Status' },
                  { key: 'floor', label: 'Bereich' },
                  { key: 'area', label: 'Raum' },
                  { key: 'friendly_name', label: 'Device' },
                  { key: 'batteryLevel', label: 'Batterielevel' },
                  { key: 'entity_id', label: 'Entity ID' },
                  { key: 'actions', label: 'Aktionen' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => setBatteriesSort(col.key)}
                    className="sticky top-0 bg-[#1c1c1e] z-10 px-4 py-3 text-left text-xs font-medium text-[#9a9a9a] uppercase tracking-wider cursor-pointer hover:text-[#00A5CB] whitespace-nowrap"
                  >
                    {col.label}<SortArrow field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map(entity => (
                <tr key={entity.entity_id} className="border-b border-[#2c2c2e] hover:bg-[#2c2c2e] transition-colors">
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 ${getIntegrationColor(entity.integration).bg} ${getIntegrationColor(entity.integration).text} rounded-full text-xs`}>
                      {entity.integration}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusDot online={entity.online} />
                  </td>
                  <td className="px-4 py-2 text-[#9a9a9a]">{entity.floor}</td>
                  <td className="px-4 py-2 text-[#9a9a9a]">{entity.area}</td>
                  <td className="px-4 py-2">
                    {editingId === entity.entity_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="px-2 py-1 bg-[#1c1c1e] border border-[#00A5CB] rounded text-[#ffffff] text-xs w-48"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="text-[#30D158] hover:text-[#40e169]">✓</button>
                        <button onClick={cancelEdit} className="text-[#FF453A] hover:text-[#ff6259]">✗</button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:text-[#00A5CB] flex items-center gap-2 group"
                        onClick={() => startEdit(entity)}
                      >
                        <span className="text-[#ffffff]">{entity.friendly_name}</span>
                        <span className="opacity-0 group-hover:opacity-30 text-[10px]">✎</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <BatteryLevelBar level={entity.batteryLevel} />
                  </td>
                  <td className="px-4 py-2">
                    <span
                      onClick={() => copyToClipboard(entity.entity_id)}
                      className="font-mono text-xs text-[#9a9a9a] hover:text-[#00A5CB] cursor-pointer px-2 py-1 bg-[#ffffff05] rounded"
                    >
                      {entity.entity_id}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => navigate(`/entities?tab=batterie&entity=${encodeURIComponent(entity.entity_id)}`)}
                      className="px-2 py-1 text-xs bg-[#00A5CB20] text-[#00A5CB] hover:bg-[#00A5CB40] border border-[#00A5CB] rounded transition-colors"
                    >
                      Entität anzeigen
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#4a4a4a]">
                    Keine Entitäten mit Label "batterie_ja" gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
