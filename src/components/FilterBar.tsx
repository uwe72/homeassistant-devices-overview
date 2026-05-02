import { useMemo } from 'react'

interface FilterBarProps {
  filters: Record<string, string>
  availableFilters: Record<string, string[]>
  onFilterChange: (category: string, value: string) => void
  dynamicFilters?: Record<string, string[]>
}

const FILTER_CONFIG: Record<string, { label: string; icon: string }> = {
  status: { label: 'Status', icon: '●' },
  typ: { label: 'Typ', icon: '◈' },
  integration: { label: 'Integration', icon: '⚡' },
  configStatus: { label: 'Konfiguration', icon: '⚙' },
  floor: { label: 'Bereich', icon: '⌂' },
  area: { label: 'Raum', icon: '◻' },
  ignore: { label: 'Ignorierte', icon: '✕' }
}

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: { online: 'Online', offline: 'Offline' },
  configStatus: { complete: 'Vollständig', incomplete: 'Unvollständig' },
  typ: { none: 'Kein Typ', 'Ignorieren': 'Ignorieren' },
  ignore: { hidden: 'Ausblenden' }
}

const DROPDOWN_CATEGORIES = new Set(['area', 'floor', 'typ', 'integration', 'status', 'configStatus', 'ignore'])

const VALUE_COLORS: Record<string, Record<string, string>> = {
  status: {
    online: 'bg-[#4a9f6e20] text-[#4a9f6e] border-[#4a9f6e]',
    offline: 'bg-[#e0525220] text-[#e05252] border-[#e05252]'
  },
  configStatus: {
    complete: 'bg-[#4a9f6e20] text-[#4a9f6e] border-[#4a9f6e]',
    incomplete: 'bg-[#e0525220] text-[#e05252] border-[#e05252]'
  }
}

export default function FilterBar({ filters, availableFilters, onFilterChange, dynamicFilters }: FilterBarProps) {
  const filterGroups = useMemo(() => {
    return Object.entries(availableFilters).map(([category, values]) => ({
      category,
      config: FILTER_CONFIG[category] || { label: category, icon: '' },
      values: dynamicFilters?.[category] || values
    }))
  }, [availableFilters, dynamicFilters])

  return (
    <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-4">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {filterGroups.map(({ category, config, values }) => (
          <div key={category} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider min-w-[80px]">
              {config.label}
            </span>
            {DROPDOWN_CATEGORIES.has(category) ? (
              <select
                value={filters[category]}
                onChange={(e) => onFilterChange(category, e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#2d3748] bg-[#0f1419] text-[#a0aec0] focus:outline-none focus:border-[#4fc3f7] cursor-pointer"
              >
                <option value="all">Alle</option>
                {values.map(value => (
                  <option key={value} value={value}>
                    {VALUE_LABELS[category]?.[value] || value}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => onFilterChange(category, 'all')}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    filters[category] === 'all'
                      ? 'bg-[#4fc3f720] text-[#4fc3f7] border-[#4fc3f7] font-medium'
                      : 'bg-[#0f1419] text-[#6b7280] border-[#2d3748] hover:border-[#4fc3f7] hover:text-[#a0aec0]'
                  }`}
                >
                  Alle
                </button>
                {values.map(value => {
                  const isActive = filters[category] === value
                  const displayLabel = VALUE_LABELS[category]?.[value] || value
                  const colorClasses = VALUE_COLORS[category]?.[value]

                  return (
                    <button
                      key={value}
                      onClick={() => onFilterChange(category, value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        isActive
                          ? colorClasses
                            ? `${colorClasses} font-medium`
                            : 'bg-[#4fc3f720] text-[#4fc3f7] border-[#4fc3f7] font-medium'
                          : 'bg-[#0f1419] text-[#6b7280] border-[#2d3748] hover:border-[#4fc3f7] hover:text-[#a0aec0]'
                      }`}
                    >
                      {displayLabel}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
