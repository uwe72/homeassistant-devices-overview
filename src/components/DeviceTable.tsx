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

export default function DeviceTable() {
  const { entities, areas, floors, updateEntityName } = useHA()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    typ: 'all',
    integration: 'all',
    floor: 'all',
    area: 'all'
  })
  const [sort, setSort] = useState<SortState>({ field: 'area', direction: 'asc' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

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

    return {
      status: ['online', 'offline'],
      typ: ['none', ...Array.from(types).sort(), ...(hasIgnore ? ['Ignorieren'] : [])],
      integration: Array.from(integrations).sort(),
      floor: Array.from(floorNames).sort(),
      area: Array.from(areaNames).sort()
    }
  }, [entities])

  const filteredEntities = useMemo(() => {
    return entities.filter(e => {
      const matchSearch = !search || 
        e.friendly_name.toLowerCase().includes(search.toLowerCase()) ||
        e.entity_id.toLowerCase().includes(search.toLowerCase()) ||
        e.area.toLowerCase().includes(search.toLowerCase())

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
      const matchIntegration = filters.integration === 'all' || e.integration === filters.integration
      const matchFloor = filters.floor === 'all' || e.floor === filters.floor
      const matchArea = filters.area === 'all' || e.area === filters.area
      return matchSearch && matchStatus && matchTyp && matchIntegration && matchFloor && matchArea
    }).sort((a, b) => {
      const va = String(a[sort.field as keyof EntityData] || '')
      const vb = String(b[sort.field as keyof EntityData] || '')
      return sort.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [entities, search, filters, sort])

  const handleFilterChange = (category: string, value: string) => {
    setFilters(prev => ({ ...prev, [category]: value }))
  }

  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
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

  const stats = {
    total: filteredEntities.length,
    online: filteredEntities.filter(e => e.online).length,
    offline: filteredEntities.filter(e => !e.online).length
  }

  const SortArrow = ({ field }: { field: string }) => (
    <span className={`ml-1 text-[10px] ${sort.field === field ? 'opacity-100 text-[#4fc3f7]' : 'opacity-30'}`}>
      {sort.field === field ? (sort.direction === 'asc' ? '▲' : '▼') : '▲'}
    </span>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#f5f5f5]">Geräteübersicht</h1>
        <div className="flex gap-4 text-sm">
          <span className="text-[#a0aec0]">Gesamt: <span className="text-[#4fc3f7] font-semibold">{stats.total}</span></span>
          <span className="text-[#a0aec0]">Online: <span className="text-[#4a9f6e] font-semibold">{stats.online}</span></span>
          <span className="text-[#a0aec0]">Offline: <span className="text-[#e05252] font-semibold">{stats.offline}</span></span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen (Name, Raum, Entity ID...)"
          className="flex-1 px-4 py-2 bg-[#1a2028] border border-[#2d3748] rounded-lg text-[#f5f5f5] placeholder-[#6b7280] focus:outline-none focus:border-[#4fc3f7]"
        />
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
                  { key: 'integration', label: 'Integration' },
                  { key: 'online', label: 'Status' },
                  { key: 'floor', label: 'Bereich' },
                  { key: 'area', label: 'Raum' },
                  { key: 'friendly_name', label: 'Device' },
                  { key: 'typ', label: 'Typ' },
                  { key: 'entity_id', label: 'Entity ID' },
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
              {filteredEntities.map(entity => (
                <tr key={entity.entity_id} className="border-b border-[#1e293b] hover:bg-[#242d38] transition-colors">
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-[#4fc3f720] text-[#4fc3f7] rounded-full text-xs">
                      {entity.integration}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusDot online={entity.online} />
                  </td>
                  <td className="px-4 py-2 text-[#a0aec0]">{entity.floor}</td>
                  <td className="px-4 py-2 text-[#a0aec0]">{entity.area}</td>
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
                          className="px-2 py-1 bg-[#0f1419] border border-[#4fc3f7] rounded text-[#f5f5f5] text-xs w-48"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="text-[#4a9f6e] hover:text-[#5abf7e]">✓</button>
                        <button onClick={cancelEdit} className="text-[#e05252] hover:text-[#f06060]">✗</button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:text-[#4fc3f7] flex items-center gap-2 group"
                        onClick={() => startEdit(entity)}
                      >
                        <span>{entity.friendly_name}</span>
                        <span className="opacity-0 group-hover:opacity-30 text-[10px]">✎</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[#f5f5f5] text-xs">
                    {entity.typ || ''}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      onClick={() => copyToClipboard(entity.entity_id)}
                      className="font-mono text-xs text-[#6b7280] hover:text-[#4fc3f7] cursor-pointer px-2 py-1 bg-[#ffffff05] rounded"
                    >
                      {entity.entity_id}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6b7280]">
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
