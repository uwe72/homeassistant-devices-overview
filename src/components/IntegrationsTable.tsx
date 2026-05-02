import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

const INTEGRATION_COLORS: Record<string, { bg: string; text: string }> = {
  'Philips Hue': { bg: 'bg-[#0A84FF20]', text: 'text-[#0A84FF]' },
  'ZHA': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'Zigbee2MQTT': { bg: 'bg-[#30D15820]', text: 'text-[#30D158]' },
  'Shelly': { bg: 'bg-[#FF9F0A20]', text: 'text-[#FF9F0A]' },
  'ESPHome': { bg: 'bg-[#FFD60A20]', text: 'text-[#FFD60A]' },
  'Homematic IP': { bg: 'bg-[#BF5AF220]', text: 'text-[#BF5AF2]' },
  'Gruppe': { bg: 'bg-[#4a4a4a20]', text: 'text-[#9a9a9a]' },
}

function getIntegrationColor(integration: string): { bg: string; text: string } {
  return INTEGRATION_COLORS[integration] || { bg: 'bg-[#0A84FF20]', text: 'text-[#0A84FF]' }
}


function getConfigStatus(entity: EntityData, currentFloorId: string | null): { isComplete: boolean; missing: string[] } {
  const missing: string[] = []
  if (!entity.typLabelRaw) missing.push('Typ')
  if (!currentFloorId) missing.push('Bereich')
  if (!entity.area_id) missing.push('Raum')
  
  return {
    isComplete: missing.length === 0,
    missing
  }
}

export default function IntegrationsTable() {
  const [searchParams] = useSearchParams()
  const { 
    integrationEntities, areas, floors, typLabels, updateEntityLabels, updateEntityName, updateEntityArea,
    integrationFilters, integrationSearch, integrationSort, setIntegrationFilter, setIntegrationSearch, setIntegrationSort
  } = useHA()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [bulkLabel, setBulkLabel] = useState('')
  const [pendingFloor, setPendingFloor] = useState<Record<string, string>>({})
  const [entityNotFound, setEntityNotFound] = useState<string | null>(null)

  const availableAreas = useMemo(() => {
    if (integrationFilters.floor === 'all') {
      return areas.map(a => a.name)
    }
    const selectedFloor = floors.find(f => f.name === integrationFilters.floor)
    if (!selectedFloor) return []
    return areas
      .filter(a => a.floor_id === selectedFloor.floor_id)
      .map(a => a.name)
  }, [integrationFilters.floor, floors, areas])

  const availableFilters = useMemo(() => {
    const types = new Set<string>()
    let hasIgnore = false
    
    const entitiesForIntegration = integrationFilters.integration === 'all' 
      ? integrationEntities 
      : integrationEntities.filter(e => e.integration === integrationFilters.integration)
    
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
      ignore: ['hidden']
    }
  }, [integrationEntities, integrationFilters.integration, floors, availableAreas])

  const integrationList = useMemo(() => {
    const integrations = new Set<string>()
    integrationEntities.forEach(e => {
      if (e.integration) integrations.add(e.integration)
    })
    return Array.from(integrations).sort()
  }, [integrationEntities])

  useEffect(() => {
    if (integrationList.length > 0 && integrationFilters.integration === 'all') {
      setIntegrationFilter('integration', integrationList[0])
    }
  }, [integrationList, integrationFilters.integration, setIntegrationFilter])

  useEffect(() => {
    const entityParam = searchParams.get('entity')
    if (entityParam && integrationEntities.length > 0) {
      const entity = integrationEntities.find(e => e.entity_id === entityParam)
      if (entity) {
        setIntegrationSearch(entityParam)
        if (entity.integration && integrationList.includes(entity.integration)) {
          setIntegrationFilter('integration', entity.integration)
        }
        setEntityNotFound(null)
      } else {
        setEntityNotFound(entityParam)
        setIntegrationSearch(entityParam)
      }
    }
  }, [searchParams, integrationEntities, integrationList, setIntegrationFilter, setIntegrationSearch])

  const totalInIntegration = useMemo(() => {
    if (integrationFilters.integration === 'all') {
      return integrationEntities.length
    }
    return integrationEntities.filter(e => e.integration === integrationFilters.integration).length
  }, [integrationEntities, integrationFilters.integration])

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
      const matchSearch = !integrationSearch ||
        e.friendly_name.toLowerCase().includes(integrationSearch.toLowerCase()) ||
        e.entity_id.toLowerCase().includes(integrationSearch.toLowerCase())

      const matchStatus = integrationFilters.status === 'all' ||
        (integrationFilters.status === 'online' ? e.online : !e.online)

      let matchTyp = true
      if (integrationFilters.typ === 'none') {
        matchTyp = e.typ === null && e.typLabelRaw !== 'typ_ignore'
      } else if (integrationFilters.typ === 'Ignorieren') {
        matchTyp = e.typLabelRaw === 'typ_ignore'
      } else if (integrationFilters.typ !== 'all') {
        matchTyp = e.typ === integrationFilters.typ
      }

      const matchIntegration = integrationFilters.integration === 'all' ||
        e.integration === integrationFilters.integration

      const currentFloorId = e.area_id ? areaToFloorMap[e.area_id] : null
      const configStatus = getConfigStatus(e, currentFloorId)
      const matchConfigStatus = integrationFilters.configStatus === 'all' ||
        (integrationFilters.configStatus === 'complete' ? configStatus.isComplete : !configStatus.isComplete)

      const entityArea = areas.find(a => a.area_id === e.area_id)
      const matchFloor = integrationFilters.floor === 'all' || entityArea?.floor_id === floors.find(f => f.name === integrationFilters.floor)?.floor_id
      const matchArea = integrationFilters.area === 'all' || e.area_id === areas.find(a => a.name === integrationFilters.area)?.area_id
      const matchIgnore = integrationFilters.ignore !== 'hidden' || e.typLabelRaw !== 'typ_ignore'

      return matchSearch && matchStatus && matchTyp && matchIntegration && matchConfigStatus && matchFloor && matchArea && matchIgnore
    }).sort((a, b) => {
      const va = String(a[integrationSort.field as keyof EntityData] || '')
      const vb = String(b[integrationSort.field as keyof EntityData] || '')
      return integrationSort.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [integrationEntities, integrationSearch, integrationFilters, integrationSort, areaToFloorMap, areas, floors])

  const handleLabelChange = async (entityId: string, newLabel: string, oldLabel: string | null) => {
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

  const handleBulkLabel = async () => {
    if (!bulkLabel) return
    const labelName = typLabels.find(l => l.label_id === bulkLabel)?.name || bulkLabel
    const toUpdate = filteredEntities.filter(e => e.typLabelRaw !== bulkLabel)
    if (toUpdate.length === 0) return
    if (!window.confirm(`${toUpdate.length} Entität(en) auf "${labelName}" setzen?`)) return
    for (const entity of toUpdate) {
      const labels = entity.typLabelRaw
        ? entity.labels.filter(l => l !== entity.typLabelRaw)
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
    <span className={`ml-1 text-[10px] ${integrationSort.field === field ? 'opacity-100 text-[#0A84FF]' : 'opacity-30'}`}>
      {integrationSort.field === field ? (integrationSort.direction === 'asc' ? '▲' : '▼') : '▲'}
    </span>
  )

  return (
    <div className="flex flex-col h-full space-y-4">
      {entityNotFound && (
        <div className="px-4 py-2 bg-[#FF453A20] border border-[#FF453A] rounded-lg text-sm text-[#FF453A]">
          Entität "{entityNotFound}" ist nicht in den Entitäten (Hue, Homematic IP) enthalten.
        </div>
      )}
      <div className="flex-shrink-0 flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#ffffff]">Integrationen</h1>
        <select
          value={integrationFilters.integration}
          onChange={(e) => setIntegrationFilter('integration', e.target.value)}
          className="px-3 py-2 text-xs bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#0A84FF] min-w-[140px]"
        >
          {integrationList.map(integration => (
            <option key={integration} value={integration}>{integration}</option>
          ))}
        </select>
        <span className="text-sm text-[#9a9a9a]">
          Zeige <span className="text-[#0A84FF] font-semibold">{filteredEntities.length}</span> von <span className="text-[#0A84FF] font-semibold">{totalInIntegration}</span> Entitäten
        </span>
        <input
          type="text"
          value={integrationSearch}
          onChange={(e) => setIntegrationSearch(e.target.value)}
          placeholder="Entitäten suchen..."
          className="flex-1 px-4 py-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] placeholder-[#4a4a4a] focus:outline-none focus:border-[#0A84FF]"
        />
        <select
          value={bulkLabel}
          onChange={(e) => setBulkLabel(e.target.value)}
          className="px-3 py-2 text-xs bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#0A84FF]"
        >
          <option value="">Typ wählen…</option>
          {[...typLabels].sort((a, b) => a.name.localeCompare(b.name)).map(label => (
            <option key={label.label_id} value={label.label_id}>{label.name}</option>
          ))}
        </select>
        <button
          onClick={handleBulkLabel}
          disabled={!bulkLabel}
          className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
            bulkLabel
              ? 'border-[#0A84FF] bg-[#0A84FF20] text-[#0A84FF] hover:bg-[#0A84FF40]'
              : 'border-[#2c2c2e] bg-[#1c1c1e] text-[#4a4a4a] cursor-not-allowed'
          }`}
        >
          Allen Zeilen zuweisen
        </button>
      </div>

      <div className="flex-shrink-0">
        <FilterBar
          filters={integrationFilters}
          availableFilters={availableFilters}
          onFilterChange={setIntegrationFilter}
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
                  { key: 'labels', label: 'Typ' },
                  { key: 'entity_id', label: 'Entity ID' },
                  { key: 'state', label: 'Wert' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => setIntegrationSort(col.key)}
                    className="sticky top-0 bg-[#1c1c1e] z-10 px-4 py-3 text-left text-xs font-medium text-[#9a9a9a] uppercase tracking-wider cursor-pointer hover:text-[#0A84FF] whitespace-nowrap"
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
                const configStatus = getConfigStatus(entity, currentFloorId)

                return (
                  <tr key={entity.entity_id} className="border-b border-[#2c2c2e] hover:bg-[#2c2c2e] transition-colors">
                    <td className="px-4 py-2">
                      {configStatus.isComplete ? (
                        <span className="px-2 py-1 bg-[#0F3D1E] text-[#30D158] rounded-full text-xs font-medium">
                          ✓ Vollständig
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-[#3D0606] text-[#FF453A] rounded-full text-xs font-medium">
                          ⚠ Unvollständig
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
                        className="px-2 py-1 bg-transparent border border-transparent hover:border-[#2c2c2e] focus:border-[#0A84FF] focus:bg-[#1c1c1e] rounded text-[#ffffff] text-xs w-48 outline-none transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={entity.typLabelRaw || ''}
                        onChange={(e) => handleLabelChange(entity.entity_id, e.target.value, entity.typLabelRaw)}
                        className={`px-2 py-1 bg-[#1c1c1e] border rounded text-xs text-[#ffffff] ${
                          !entity.typLabelRaw ? 'border-[#FF453A]' : 'border-[#2c2c2e]'
                        }`}
                      >
                        <option value="">- Kein Typ -</option>
                        {[...typLabels].sort((a, b) => a.name.localeCompare(b.name)).map(label => (
                          <option key={label.label_id} value={label.label_id}>{label.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        onClick={() => copyToClipboard(entity.entity_id)}
                        className="font-mono text-xs text-[#9a9a9a] hover:text-[#0A84FF] cursor-pointer px-2 py-1 bg-[#ffffff05] rounded"
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
