import { useMemo } from 'react'

interface FilterBarProps {
  filters: Record<string, string>
  availableFilters: Record<string, string[]>
  onFilterChange: (category: string, value: string) => void
  dynamicFilters?: Record<string, string[]>
  excludeFilters?: string[]
}

const FILTER_CONFIG: Record<string, { label: string; icon: string }> = {
  status: { label: 'Status', icon: '●' },
  typ: { label: 'Typ', icon: '◈' },
  integration: { label: 'Integration', icon: '⚡' },
  configStatus: { label: 'Konfiguration', icon: '⚙' },
  floor: { label: 'Bereich', icon: '⌂' },
  area: { label: 'Raum', icon: '◻' },
  batterie: { label: 'Batterie', icon: '⏻' }
}

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: { online: 'Online', offline: 'Offline' },
  configStatus: { complete: 'Vollständig', incomplete: 'Unvollständig' },
  typ: { none: 'Kein Typ', 'Ignorieren': 'Ignorieren' },
  batterie: { ohne_zuordnung: 'Ohne Zuordnung', batterie_ja: 'Ja', batterie_nein: 'Nein' }
}

const DROPDOWN_CATEGORIES = new Set(['area', 'floor', 'typ', 'integration', 'status', 'configStatus', 'ignore', 'batterie'])

const VALUE_COLORS: Record<string, Record<string, string>> = {
  status: {
    online: 'bg-[#0F3D1E] text-[#30D158] border-[#30D158]',
    offline: 'bg-[#3D0606] text-[#FF453A] border-[#FF453A]'
  },
  configStatus: {
    complete: 'bg-[#0F3D1E] text-[#30D158] border-[#30D158]',
    incomplete: 'bg-[#3D0606] text-[#FF453A] border-[#FF453A]'
  }
}

export default function FilterBar({ filters, availableFilters, onFilterChange, dynamicFilters, excludeFilters = [] }: FilterBarProps) {
  const filterGroups = useMemo(() => {
    return Object.entries(availableFilters)
      .filter(([category]) => !excludeFilters.includes(category))
      .map(([category, values]) => ({
        category,
        config: FILTER_CONFIG[category] || { label: category, icon: '' },
        values: dynamicFilters?.[category] || values
      }))
  }, [availableFilters, dynamicFilters, excludeFilters])

  return (
    <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {filterGroups.map(({ category, config, values }) => (
          <div key={category} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#0A84FF] uppercase tracking-wider min-w-[80px]">
              {config.label}
            </span>
            {DROPDOWN_CATEGORIES.has(category) ? (
              <select
                value={filters[category]}
                onChange={(e) => onFilterChange(category, e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#2c2c2e] bg-[#1c1c1e] text-[#9a9a9a] focus:outline-none focus:border-[#0A84FF] cursor-pointer"
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
                      ? 'bg-[#0A84FF20] text-[#0A84FF] border-[#0A84FF] font-medium'
                      : 'bg-[#1c1c1e] text-[#4a4a4a] border-[#2c2c2e] hover:border-[#0A84FF] hover:text-[#9a9a9a]'
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
                            : 'bg-[#0A84FF20] text-[#0A84FF] border-[#0A84FF] font-medium'
                          : 'bg-[#1c1c1e] text-[#4a4a4a] border-[#2c2c2e] hover:border-[#0A84FF] hover:text-[#9a9a9a]'
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
