import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

function getConfigStatus(entity: EntityData, currentFloorId: string | null, batterieLabel: string | null): { isComplete: boolean; missing: string[] } {
  const missing: string[] = []
  if (!entity.typLabelRaw) missing.push('Typ')
  if (!currentFloorId) missing.push('Bereich')
  if (!entity.area_id) missing.push('Raum')
  if (!batterieLabel) missing.push('Batterie')
  
  return {
    isComplete: missing.length === 0,
    missing
  }
}

export default function BatteryTable() {
  const [searchParams] = useSearchParams()
  const { 
    integrationEntities, areas, floors, updateEntityLabels, updateEntityName, updateEntityArea,
    batteryFilters, batterySearch, batterySort, setBatteryFilter, setBatterySearch, setBatterySort
  } = useHA()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [bulkLabel, setBulkLabel] = useState('')
  const [pendingFloor, setPendingFloor] = useState<Record<string, string>>({})

  const availableAreas = useMemo(() => {
    if (batteryFilters.floor === 'all') {
      return areas.map(a => a.name)
    }
    const selectedFloor = floors.find(f => f.name === batteryFilters.floor)
    if (!selectedFloor) return []
    return areas
      .filter(a => a.floor_id === selectedFloor.floor_id)
      .map(a => a.name)
  }, [batteryFilters.floor, floors, areas])

  const availableFilters = useMemo(() => {
    const types = new Set<string>()
    let hasIgnore = false
    
    const entitiesForIntegration = batteryFilters.integration === 'all' 
      ? integrationEntities 
      : integrationEntities.filter(e => e.integration === batteryFilters.integration)
    
    entitiesForIntegration.forEach(e => {
      if (e.typ) types.add(e.typ)
      if (e.typLabelRaw === 'typ_ignore') hasIgnore = true
    })
    
    return {
      status: ['online', 'offline'],
      typ: ['none', ...Array.from(types).sort(), ...(hasIgnore ? ['Ignorieren'] : [])],
      configStatus: ['complete', 'incomplete'],
      floor: floors.map(f => f.name),
      area: availableAreas,
      batterie: ['ohne_zuordnung', 'batterie_ja', 'batterie_nein']
    }
  }, [integrationEntities, batteryFilters.integration, floors, availableAreas])

  const integrationList = useMemo(() => {
    const integrations = new Set<string>()
    integrationEntities.forEach(e => {
      if (e.integration) integrations.add(e.integration)
    })
    return Array.from(integrations).sort()
  }, [integrationEntities])

  useEffect(() => {
    const entityIdParam = searchParams.get('entity_id')
    if (entityIdParam && integrationEntities.length > 0) {
      const entity = integrationEntities.find(e => e.entity_id === entityIdParam)
      if (entity) {
        setBatterySearch(entityIdParam)
        if (entity.integration && integrationList.includes(entity.integration)) {
          setBatteryFilter('integration', entity.integration)
        }
      } else {
        setBatterySearch(entityIdParam)
      }
    }
  }, [searchParams, integrationEntities, integrationList, setBatteryFilter, setBatterySearch])

  const totalInIntegration = useMemo(() => {
    if (batteryFilters.integration === 'all') {
      return integrationEntities.length
    }
    return integrationEntities.filter(e => e.integration === batteryFilters.integration).length
  }, [integrationEntities, batteryFilters.integration])

  const areaToFloorMap = useMemo(() => {
    const map: Record<string, string> = {}
    areas.forEach(a => {
      if (a.floor_id) {
        map[a.area_id] = a.floor_id
      }
    })
    return map
  }, [areas])

  const floorToAreasMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    areas.forEach(a => {
      if (a.floor_id) {
        if (!map[a.floor_id]) map[a.floor_id] = []
        map[a.floor_id].push(a.area_id)
      }
    })
    return map
  }, [areas])

  const filteredEntities = useMemo(() => {
    return integrationEntities.filter(e => {
      const searchTerms = batterySearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
      const matchSearch = searchTerms.length === 0 ||
        searchTerms.every(term =>
          e.friendly_name.toLowerCase().includes(term) ||
          e.entity_id.toLowerCase().includes(term)
        )

      const matchStatus = batteryFilters.status === 'all' ||
        (batteryFilters.status === 'online' ? e.online : !e.online)

      let matchTyp = true
      if (batteryFilters.typ === 'none') {
        matchTyp = e.typ === null && e.typLabelRaw !== 'typ_ignore'
      } else if (batteryFilters.typ === 'Ignorieren') {
        matchTyp = e.typLabelRaw === 'typ_ignore'
      } else if (batteryFilters.typ !== 'all') {
        matchTyp = e.typ === batteryFilters.typ
      }

      const matchIntegration = batteryFilters.integration === 'all' ||
        e.integration === batteryFilters.integration

      const batterieLabel = e.labels.find(l => l && l.startsWith('batterie_')) || null
      const currentFloorId = e.area_id ? areaToFloorMap[e.area_id] : null
      const configStatus = getConfigStatus(e, currentFloorId, batterieLabel)
      const matchConfigStatus = batteryFilters.configStatus === 'all' ||
        (batteryFilters.configStatus === 'complete' ? configStatus.isComplete : !configStatus.isComplete)

      const entityArea = areas.find(a => a.area_id === e.area_id)
      const matchFloor = batteryFilters.floor === 'all' || entityArea?.floor_id === floors.find(f => f.name === batteryFilters.floor)?.floor_id
      const matchArea = batteryFilters.area === 'all' || e.area_id === areas.find(a => a.name === batteryFilters.area)?.area_id

      let matchBatterie = true
      if (batteryFilters.batterie === 'ohne_zuordnung') {
        matchBatterie = !batterieLabel
      } else if (batteryFilters.batterie === 'batterie_ja') {
        matchBatterie = batterieLabel === 'batterie_ja'
      } else if (batteryFilters.batterie === 'batterie_nein') {
        matchBatterie = batterieLabel === 'batterie_nein'
      }

      return matchSearch && matchStatus && matchTyp && matchIntegration && matchConfigStatus && matchFloor && matchArea && matchBatterie
    }).sort((a, b) => {
      const va = String(a[batterySort.field as keyof EntityData] || '')
      const vb = String(b[batterySort.field as keyof EntityData] || '')
      return batterySort.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [integrationEntities, batterySearch, batteryFilters, batterySort, areaToFloorMap, areas, floors])

  const handleBatterieLabelChange = async (entityId: string, newLabel: string, oldLabel: string | null) => {
    const entity = integrationEntities.find(e => e.entity_id === entityId)
    if (!entity) return

    let labels = [...entity.labels]
    if (oldLabel) {
      labels = labels.filter(l => l !== oldLabel)
    }
    if (newLabel) {
      labels.push(newLabel)
    }

    await updateEntityLabels(entityId, labels)
  }

  const handleBulkBatterieLabel = async () => {
    if (!bulkLabel) return
    const labelName = bulkLabel === 'batterie_ja' ? 'Ja' : 'Nein'
    const toUpdate = filteredEntities.filter(e => {
      const currentBatterie = e.labels.find(l => l && l.startsWith('batterie_'))
      return currentBatterie !== bulkLabel
    })
    if (toUpdate.length === 0) return
    if (!window.confirm(`${toUpdate.length} Entität(en) auf "${labelName}" setzen?`)) return
    for (const entity of toUpdate) {
      const currentBatterie = entity.labels.find(l => l && l.startsWith('batterie_'))
      let labels = currentBatterie
        ? entity.labels.filter(l => l !== currentBatterie)
        : [...entity.labels]
      labels.push(bulkLabel)
      await updateEntityLabels(entity.entity_id, labels)
    }
  }

  const handleAreaChange = async (entityId: string, areaId: string) => {
    await updateEntityArea(entityId, areaId || null)
  }

  const saveEdit = async () => {
    if (editingId && editValue.trim()) {
      await updateEntityName(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const SortArrow = ({ field }: { field: string }) => (
    <span className={`ml-1 text-[10px] ${batterySort.field === field ? 'opacity-100 text-[#00A5CB]' : 'opacity-30'}`}>
      {batterySort.field === field ? (batterySort.direction === 'asc' ? '▲' : '▼') : '▲'}
    </span>
  )

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-shrink-0 flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#ffffff]">Batterien</h1>
        <select
          value={batteryFilters.integration}
          onChange={(e) => setBatteryFilter('integration', e.target.value)}
          className="px-3 py-2 text-xs bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#00A5CB] min-w-[140px]"
        >
          <option value="all">Alle</option>
          {integrationList.map(integration => (
            <option key={integration} value={integration}>{integration}</option>
          ))}
        </select>
        <span className="text-sm text-[#9a9a9a]">
          Zeige <span className="text-[#00A5CB] font-semibold">{filteredEntities.length}</span> von <span className="text-[#00A5CB] font-semibold">{totalInIntegration}</span> Entitäten
        </span>
        <SearchInput
          value={batterySearch}
          onChange={setBatterySearch}
          placeholder="Suchen (mehrere Begriffe mit Leerzeichen = UND)"
        />
        <select
          value={bulkLabel}
          onChange={(e) => setBulkLabel(e.target.value)}
          className="px-3 py-2 text-xs bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#00A5CB]"
        >
          <option value="">Batterie wählen...</option>
          <option value="batterie_ja">Ja</option>
          <option value="batterie_nein">Nein</option>
        </select>
        <button
          onClick={handleBulkBatterieLabel}
          disabled={!bulkLabel}
          className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
            bulkLabel
              ? 'border-[#00A5CB] bg-[#00A5CB20] text-[#00A5CB] hover:bg-[#00A5CB40]'
              : 'border-[#2c2c2e] bg-[#1c1c1e] text-[#4a4a4a] cursor-not-allowed'
          }`}
        >
          Allen Zeilen zuweisen
        </button>
      </div>

      <div className="flex-shrink-0">
        <FilterBar
          filters={batteryFilters}
          availableFilters={availableFilters}
          onFilterChange={setBatteryFilter}
        />
      </div>

      <div className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1c1c1e] border-b border-[#2c2c2e]">
                {[
                  { key: 'configStatus', label: 'Konfiguration' },
                  { key: 'online', label: 'Status' },
                  { key: 'integration', label: 'Integration' },
                  { key: 'floor', label: 'Bereich' },
                  { key: 'area', label: 'Raum' },
                  { key: 'friendly_name', label: 'Device' },
                  { key: 'batterie', label: 'Batterie' },
                  { key: 'entity_id', label: 'Entity ID' },
                  { key: 'state', label: 'Wert' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => setBatterySort(col.key)}
                    className="sticky top-0 bg-[#1c1c1e] z-10 px-4 py-3 text-left text-xs font-medium text-[#9a9a9a] uppercase tracking-wider cursor-pointer hover:text-[#00A5CB] whitespace-nowrap"
                  >
                    {col.label}<SortArrow field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map(entity => {
                const floorFromArea = entity.area_id ? areaToFloorMap[entity.area_id] : null
                const currentFloorId = floorFromArea || pendingFloor[entity.entity_id] || null
                const availableAreas = currentFloorId && floorToAreasMap[currentFloorId]
                  ? floorToAreasMap[currentFloorId].map(aid => areas.find(a => a.area_id === aid)).filter(Boolean)
                  : areas
                const batterieLabel = entity.labels.find(l => l && l.startsWith('batterie_')) || null
                const configStatus = getConfigStatus(entity, currentFloorId, batterieLabel)

                return (
                  <tr key={entity.entity_id} className="border-b border-[#2c2c2e] hover:bg-[#2c2c2e] transition-colors">
                    <td className="px-4 py-2">
                      {configStatus.isComplete ? (
                        <span className="px-2 py-1 bg-[#0F3D1E] text-[#30D158] rounded-full text-xs font-medium">
                          ✓ Vollständig
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-[#3D0606] text-[#FF453A] rounded-full text-xs font-medium">
                          ⚠ {configStatus.missing.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <StatusDot online={entity.online} />
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 ${getIntegrationColor(entity.integration).bg} ${getIntegrationColor(entity.integration).text} rounded-full text-xs`}>
                        {entity.integration}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={currentFloorId || ''}
                        onChange={(e) => {
                          const floorId = e.target.value
                          const floorAreas = floorToAreasMap[floorId] || []
                          if (!floorAreas.includes(entity.area_id || '')) {
                            handleAreaChange(entity.entity_id, '')
                          }
                          setPendingFloor(prev => {
                            if (!floorId) {
                              const { [entity.entity_id]: _, ...rest } = prev
                              return rest
                            }
                            return { ...prev, [entity.entity_id]: floorId }
                          })
                        }}
                        className={`px-2 py-1 bg-[#1c1c1e] border rounded text-xs text-[#ffffff] min-w-[120px] ${
                          !currentFloorId ? 'border-[#FF453A]' : 'border-[#2c2c2e]'
                        }`}
                      >
                        <option value="">Nicht zugeordnet</option>
                        {floors.map(floor => (
                          <option key={floor.floor_id} value={floor.floor_id}>{floor.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={entity.area_id || ''}
                        onChange={(e) => {
                          handleAreaChange(entity.entity_id, e.target.value)
                          setPendingFloor(prev => {
                            const { [entity.entity_id]: _, ...rest } = prev
                            return rest
                          })
                        }}
                        className={`px-2 py-1 bg-[#1c1c1e] border rounded text-xs text-[#ffffff] min-w-[120px] ${
                          !entity.area_id ? 'border-[#FF453A]' : 'border-[#2c2c2e]'
                        }`}
                      >
                        <option value="">Nicht zugeordnet</option>
                        {availableAreas.map(area => area && (
                          <option key={area.area_id} value={area.area_id}>{area.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editingId === entity.entity_id ? editValue : entity.friendly_name}
                        onChange={(e) => {
                          if (editingId === entity.entity_id) {
                            setEditValue(e.target.value)
                          }
                        }}
                        onFocus={() => {
                          setEditingId(entity.entity_id)
                          setEditValue(entity.friendly_name)
                        }}
                        onBlur={() => {
                          if (editingId === entity.entity_id && editValue.trim() && editValue !== entity.friendly_name) {
                            saveEdit()
                          } else {
                            setEditingId(null)
                            setEditValue('')
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingId === entity.entity_id) {
                            e.currentTarget.blur()
                          }
                          if (e.key === 'Escape') {
                            setEditValue(entity.friendly_name)
                            setEditingId(null)
                          }
                        }}
                        className="px-2 py-1 bg-transparent border border-transparent hover:border-[#2c2c2e] focus:border-[#00A5CB] focus:bg-[#1c1c1e] rounded text-[#ffffff] text-xs w-48 outline-none transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={batterieLabel || ''}
                        onChange={(e) => handleBatterieLabelChange(entity.entity_id, e.target.value, batterieLabel)}
                        className={`px-2 py-1 bg-[#1c1c1e] border rounded text-xs text-[#ffffff] ${
                          !batterieLabel ? 'border-[#FF453A]' : 'border-[#2c2c2e]'
                        }`}
                      >
                        <option value="">Ohne Zuordnung</option>
                        <option value="batterie_ja">Ja</option>
                        <option value="batterie_nein">Nein</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        onClick={() => copyToClipboard(entity.entity_id)}
                        className="font-mono text-xs text-[#9a9a9a] hover:text-[#00A5CB] cursor-pointer px-2 py-1 bg-[#ffffff05] rounded"
                      >
                        {entity.entity_id}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#9a9a9a]">
                      {entity.state}
                    </td>
                  </tr>
                )
              })}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#4a4a4a]">
                    Keine Entitäten gefunden
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
