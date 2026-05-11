import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHA } from '../context/HAContext'
import FilterBar from './FilterBar'
import SearchInput from './SearchInput'
import type { EntityData } from '../types'

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs ${online ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-[#30D158] shadow-[0_0_6px_rgba(48,209,88,0.4)]' : 'bg-[#FF453A] shadow-[0_0_6px_rgba(255,69,58,0.4)]'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

const INTEGRATION_COLORS: Record<string, { bg: string; text: string }> = {
  'Philips Hue': { bg: 'bg-[#00A5CB20]', text: 'text-[#00A5CB]' },
  'ZHA': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'Zigbee2MQTT': { bg: 'bg-[#30D15820]', text: 'text-[#30D158]' },
  'Shelly': { bg: 'bg-[#FF9F0A20]', text: 'text-[#FF9F0A]' },
  'ESPHome': { bg: 'bg-[#FFD60A20]', text: 'text-[#FFD60A]' },
  'Homematic IP': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'Homematic': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'deCONZ': { bg: 'bg-[#FFD60A20]', text: 'text-[#FFD60A]' },
  'meross_lan': { bg: 'bg-[#30D15820]', text: 'text-[#30D158]' },
  'ecovacs': { bg: 'bg-[#30D15820]', text: 'text-[#30D158]' },
  'Remote Home-Assistant': { bg: 'bg-[#0A84FF20]', text: 'text-[#0A84FF]' },
  'Gruppe': { bg: 'bg-[#4a4a4a20]', text: 'text-[#9a9a9a]' },
}

function getIntegrationColor(integration: string): { bg: string; text: string } {
  return INTEGRATION_COLORS[integration] || { bg: 'bg-[#00A5CB20]', text: 'text-[#00A5CB]' }
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'typ_licht': { bg: 'bg-[#0D3D47]', text: 'text-[#22D3EE]' },
  'typ_sensor': { bg: 'bg-[#2D1347]', text: 'text-[#BF5AF2]' },
  'typ_schalter': { bg: 'bg-[#1A3A5C]', text: 'text-[#60A5FA]' },
  'typ_lichtschalter': { bg: 'bg-[#3D1A2A]', text: 'text-[#FB7185]' },
  'typ_rollladenschalter': { bg: 'bg-[#3D1A4D]', text: 'text-[#E879F9]' },
  'typ_bewegungsmelder': { bg: 'bg-[#3D1A3D]', text: 'text-[#F472B6]' },
  'typ_steckdose': { bg: 'bg-[#0D3D3A]', text: 'text-[#14B8A6]' },
  'typ_dimmer': { bg: 'bg-[#2E2866]', text: 'text-[#818CF8]' },
  'typ_thermostat': { bg: 'bg-[#2D1A5C]', text: 'text-[#A78BFA]' },
  'typ_klimaanlage': { bg: 'bg-[#0C3A55]', text: 'text-[#38BDF8]' },
  'typ_jalousie': { bg: 'bg-[#2D2A5C]', text: 'text-[#C4B5FD]' },
  'typ_fenster': { bg: 'bg-[#3D0A4D]', text: 'text-[#D946EF]' },
  'typ_tuer': { bg: 'bg-[#1A3A5C]', text: 'text-[#93C5FD]' },
  'typ_taste': { bg: 'bg-[#3D1A6C]', text: 'text-[#C084FC]' },
  'typ_ventilator': { bg: 'bg-[#0D4A47]', text: 'text-[#5EEAD4]' },
  'typ_ignore': { bg: 'bg-[#2a2a2a]', text: 'text-[#4a4a4a]' },
}

const TYPE_FALLBACK_COLOR = { bg: 'bg-[#1e3a5f]', text: 'text-[#60a5fa]' }

function getTypeColor(typLabelRaw: string | null): { bg: string; text: string } | null {
  if (!typLabelRaw) return null
  return TYPE_COLORS[typLabelRaw] || TYPE_FALLBACK_COLOR
}

function formatTyp(typ: string | null): string {
  if (!typ) return '—'
  if (typ.startsWith('typ_')) {
    const raw = typ.replace('typ_', '')
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  return typ
}

export default function DeviceTable() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { entities, areas, floors, updateEntityName, deviceFilters, deviceSearch, deviceSort, setDeviceFilter, setDeviceSearch, setDeviceSort } = useHA()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    const entityIdParam = searchParams.get('entity_id')
    if (entityIdParam && entityIdParam !== deviceSearch) {
      setDeviceSearch(entityIdParam)
    }
  }, [searchParams])

  const availableFilters = useMemo(() => {
    const types = new Set<string>()
    const integrations = new Set<string>()
    const floorNames = new Set<string>()
    const areaNames = new Set<string>()
    let hasIgnore = false

    entities.forEach(e => {
      if (e.typ) types.add(e.typ)
      if (e.typLabelRaw === 'typ_ignore') hasIgnore = true
      if (e.integration) integrations.add(e.integration)
      if (e.floor !== '—') floorNames.add(e.floor)
      if (e.area !== '—') areaNames.add(e.area)
    })

    let filteredAreas: string[]
    if (deviceFilters.floor === 'all') {
      filteredAreas = Array.from(areaNames).sort()
    } else {
      const selectedFloor = floors.find(f => f.name === deviceFilters.floor)
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
      typ: ['none', ...Array.from(types).sort(), ...(hasIgnore ? ['Ignorieren'] : [])],
      integration: Array.from(integrations).sort(),
      floor: Array.from(floorNames).sort(),
      area: filteredAreas
    }
  }, [entities, areas, floors, deviceFilters.floor])

  const filteredEntities = useMemo(() => {
    return entities.filter(e => {
      const searchTerms = deviceSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
      const matchSearch = searchTerms.length === 0 ||
        searchTerms.every(term =>
          e.friendly_name.toLowerCase().includes(term) ||
          e.entity_id.toLowerCase().includes(term) ||
          e.area.toLowerCase().includes(term)
        )

      const matchStatus = deviceFilters.status === 'all' ||
        (deviceFilters.status === 'online' ? e.online : !e.online)

      let matchTyp = true
      if (deviceFilters.typ === 'none') {
        matchTyp = e.typ === null && e.typLabelRaw !== 'typ_ignore'
      } else if (deviceFilters.typ === 'Ignorieren') {
        matchTyp = e.typLabelRaw === 'typ_ignore'
      } else if (deviceFilters.typ !== 'all') {
        matchTyp = e.typ === deviceFilters.typ
      }
      const matchIntegration = deviceFilters.integration === 'all' || e.integration === deviceFilters.integration
      const matchFloor = deviceFilters.floor === 'all' || e.floor === deviceFilters.floor
      const matchArea = deviceFilters.area === 'all' || e.area === deviceFilters.area
      return matchSearch && matchStatus && matchTyp && matchIntegration && matchFloor && matchArea
    }).sort((a, b) => {
      const va = String(a[deviceSort.field as keyof EntityData] || '')
      const vb = String(b[deviceSort.field as keyof EntityData] || '')
      const primarySort = deviceSort.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      if (primarySort !== 0) return primarySort
      const nameA = String(a.friendly_name || '')
      const nameB = String(b.friendly_name || '')
      return nameA.localeCompare(nameB)
    })
  }, [entities, deviceSearch, deviceFilters, deviceSort])

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
    <span className={`ml-1 text-[10px] ${deviceSort.field === field ? 'opacity-100 text-[#00A5CB]' : 'opacity-30'}`}>
      {deviceSort.field === field ? (deviceSort.direction === 'asc' ? '▲' : '▼') : '▲'}
    </span>
  )

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-shrink-0 flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#ffffff]">Geräte</h1>
        <select
          value={deviceFilters.integration}
          onChange={(e) => setDeviceFilter('integration', e.target.value)}
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
        <SearchInput
          value={deviceSearch}
          onChange={setDeviceSearch}
          placeholder="Suchen (mehrere Begriffe mit Leerzeichen = UND)"
        />
      </div>

      <div className="flex-shrink-0">
        <FilterBar
          filters={deviceFilters}
          availableFilters={availableFilters}
          onFilterChange={setDeviceFilter}
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
                  { key: 'typ', label: 'Typ' },
                  { key: 'entity_id', label: 'Entity ID' },
                  { key: 'actions', label: 'Aktionen' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => setDeviceSort(col.key)}
                    className="sticky top-0 bg-[#1c1c1e] z-10 px-4 py-3 text-left text-xs font-medium text-[#9a9a9a] uppercase tracking-wider cursor-pointer hover:text-[#00A5CB] whitespace-nowrap"
                  >
                    {col.label}<SortArrow field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map(entity => {
                const typeColor = getTypeColor(entity.typLabelRaw)
                return (
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
                    {entity.typ ? (
                      <span className={`px-2 py-1 ${typeColor?.bg || ''} text-[#ffffff] rounded-full text-xs font-medium`}>
                        {formatTyp(entity.typ)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#4a4a4a]">—</span>
                    )}
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
                      onClick={() => navigate(`/entities?tab=geraete&entity_id=${encodeURIComponent(entity.entity_id)}`)}
                      className="px-2 py-1 text-xs bg-[#00A5CB20] text-[#00A5CB] hover:bg-[#00A5CB40] border border-[#00A5CB] rounded transition-colors"
                    >
                      Entität anzeigen
                    </button>
                  </td>
                </tr>
              )})}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#4a4a4a]">
                    Keine Geräte gefunden
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
