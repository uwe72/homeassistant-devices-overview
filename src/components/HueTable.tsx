import { useState, useMemo } from 'react'
import { useHA } from '../context/HAContext'
import FilterBar from './FilterBar'
import type { EntityData, SortState } from '../types'

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs ${online ? 'text-[#4a9f6e]' : 'text-[#e05252]'}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-[#4a9f6e] shadow-[0_0_6px_rgba(74,159,110,0.4)]' : 'bg-[#e05252] shadow-[0_0_6px_rgba(224,82,82,0.4)]'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
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

export default function HueTable() {
  const { hueEntities, areas, floors, typLabels, updateEntityLabels, updateEntityName, updateEntityArea } = useHA()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    typ: 'all',
    configStatus: 'all',
    floor: 'all',
    area: 'all',
    ignore: 'hidden'
  })
  const [sort, setSort] = useState<SortState>({ field: 'friendly_name', direction: 'asc' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [bulkLabel, setBulkLabel] = useState('')
  const [pendingFloor, setPendingFloor] = useState<Record<string, string>>({})

  const availableAreas = useMemo(() => {
    if (filters.floor === 'all') {
      return areas.map(a => a.name)
    }
    const selectedFloor = floors.find(f => f.name === filters.floor)
    if (!selectedFloor) return []
    return areas
      .filter(a => a.floor_id === selectedFloor.floor_id)
      .map(a => a.name)
  }, [filters.floor, floors, areas])

  const availableFilters = useMemo(() => {
    const types = new Set<string>()
    let hasIgnore = false
    hueEntities.forEach(e => {
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
  }, [hueEntities, floors, availableAreas])

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
    return hueEntities.filter(e => {
      const matchSearch = !search ||
        e.friendly_name.toLowerCase().includes(search.toLowerCase()) ||
        e.entity_id.toLowerCase().includes(search.toLowerCase())

      const matchStatus = filters.status === 'all' ||
        (filters.status === 'online' ? e.online : !e.online)

      let matchTyp = true
      if (filters.typ === 'none') {
        matchTyp = e.typ === null && e.typLabelRaw !== 'typ_ignore'
      } else if (filters.typ === 'Ignorieren') {
        matchTyp = e.typLabelRaw === 'typ_ignore'
      } else if (filters.typ !== 'all') {
        matchTyp = e.typ === filters.typ
      }

      const currentFloorId = e.area_id ? areaToFloorMap[e.area_id] : null
      const configStatus = getConfigStatus(e, currentFloorId)
      const matchConfigStatus = filters.configStatus === 'all' ||
        (filters.configStatus === 'complete' ? configStatus.isComplete : !configStatus.isComplete)

      const entityArea = areas.find(a => a.area_id === e.area_id)
      const matchFloor = filters.floor === 'all' || entityArea?.floor_id === floors.find(f => f.name === filters.floor)?.floor_id
      const matchArea = filters.area === 'all' || e.area_id === areas.find(a => a.name === filters.area)?.area_id
      const matchIgnore = filters.ignore !== 'hidden' || e.typLabelRaw !== 'typ_ignore'

      return matchSearch && matchStatus && matchTyp && matchConfigStatus && matchFloor && matchArea && matchIgnore
    }).sort((a, b) => {
      const va = String(a[sort.field as keyof EntityData] || '')
      const vb = String(b[sort.field as keyof EntityData] || '')
      return sort.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [hueEntities, search, filters, sort, areaToFloorMap, areas, floors])

  const handleFilterChange = (category: string, value: string) => {
    setFilters(prev => ({ ...prev, [category]: value }))
  }

  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
  }

  const handleLabelChange = async (entityId: string, newLabel: string, oldLabel: string | null) => {
    const entity = hueEntities.find(e => e.entity_id === entityId)
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

  const SortArrow = ({ field }: { field: string }) => (
    <span className={`ml-1 text-[10px] ${sort.field === field ? 'opacity-100 text-[#4fc3f7]' : 'opacity-30'}`}>
      {sort.field === field ? (sort.direction === 'asc' ? '▲' : '▼') : '▲'}
    </span>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#f5f5f5]">Philips Hue Entitäten</h1>
        <span className="text-sm text-[#a0aec0]">
          Zeige <span className="text-[#4fc3f7] font-semibold">{filteredEntities.length}</span> von <span className="text-[#4fc3f7] font-semibold">{hueEntities.length}</span> Entitäten
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hue Entitäten suchen..."
          className="flex-1 px-4 py-2 bg-[#1a2028] border border-[#2d3748] rounded-lg text-[#f5f5f5] placeholder-[#6b7280] focus:outline-none focus:border-[#4fc3f7]"
        />
        <select
          value={bulkLabel}
          onChange={(e) => setBulkLabel(e.target.value)}
          className="px-3 py-2 text-xs bg-[#1a2028] border border-[#2d3748] rounded-lg text-[#f5f5f5] focus:outline-none focus:border-[#4fc3f7]"
        >
          <option value="">Typ wählen…</option>
          {typLabels.map(label => (
            <option key={label.label_id} value={label.label_id}>{label.name}</option>
          ))}
        </select>
        <button
          onClick={handleBulkLabel}
          disabled={!bulkLabel}
          className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
            bulkLabel
              ? 'border-[#4fc3f7] bg-[#4fc3f720] text-[#4fc3f7] hover:bg-[#4fc3f740]'
              : 'border-[#2d3748] bg-[#1a2028] text-[#6b7280] cursor-not-allowed'
          }`}
        >
          Allen Zeilen zuweisen
        </button>
      </div>

      <FilterBar
        filters={filters}
        availableFilters={availableFilters}
        onFilterChange={handleFilterChange}
      />

      <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f1419] border-b border-[#2d3748]">
                {[
                  { key: 'configStatus', label: 'Konfiguration' },
                  { key: 'online', label: 'Status' },
                  { key: 'floor', label: 'Bereich' },
                  { key: 'area', label: 'Raum' },
                  { key: 'friendly_name', label: 'Device' },
                  { key: 'labels', label: 'Typ' },
                  { key: 'entity_id', label: 'Entity ID' },
                  { key: 'state', label: 'Wert' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-medium text-[#a0aec0] uppercase tracking-wider cursor-pointer hover:text-[#4fc3f7] whitespace-nowrap"
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
                  <tr key={entity.entity_id} className="border-b border-[#1e293b] hover:bg-[#242d38] transition-colors">
                    <td className="px-4 py-2">
                      {configStatus.isComplete ? (
                        <span className="px-2 py-1 bg-[#4a9f6e20] text-[#4a9f6e] rounded-full text-xs font-medium">
                          ✓ Vollständig
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-[#e0525220] text-[#e05252] rounded-full text-xs font-medium">
                          ⚠ Unvollständig
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <StatusDot online={entity.online} />
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
                        className={`px-2 py-1 bg-[#0f1419] border rounded text-xs text-[#f5f5f5] min-w-[120px] ${
                          !currentFloorId ? 'border-[#e05252]' : 'border-[#2d3748]'
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
                        className={`px-2 py-1 bg-[#0f1419] border rounded text-xs text-[#f5f5f5] min-w-[120px] ${
                          !entity.area_id ? 'border-[#e05252]' : 'border-[#2d3748]'
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
                        className="px-2 py-1 bg-transparent border border-transparent hover:border-[#2d3748] focus:border-[#4fc3f7] focus:bg-[#0f1419] rounded text-[#f5f5f5] text-xs w-48 outline-none transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={entity.typLabelRaw || ''}
                        onChange={(e) => handleLabelChange(entity.entity_id, e.target.value, entity.typLabelRaw)}
                        className={`px-2 py-1 bg-[#0f1419] border rounded text-xs text-[#f5f5f5] ${
                          !entity.typLabelRaw ? 'border-[#e05252]' : 'border-[#2d3748]'
                        }`}
                      >
                        <option value="">- Kein Typ -</option>
                        {typLabels.map(label => (
                          <option key={label.label_id} value={label.label_id}>{label.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        onClick={() => copyToClipboard(entity.entity_id)}
                        className="font-mono text-xs text-[#6b7280] hover:text-[#4fc3f7] cursor-pointer px-2 py-1 bg-[#ffffff05] rounded"
                      >
                        {entity.entity_id}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#a0aec0]">
                      {entity.state}
                    </td>
                  </tr>
                )
              })}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#6b7280]">
                    Keine Hue-Geräte gefunden
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
