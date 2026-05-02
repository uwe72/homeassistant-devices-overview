import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useHA } from '../context/HAContext'

const COLORS = ['#4fc3f7', '#4a9f6e', '#d4a853', '#e05252', '#ab47bc', '#66bb6a', '#ffa726', '#5c6bc0']

export default function Statistics() {
  const { entities, hueEntities } = useHA()

  const integrationStats = useMemo(() => {
    const counts: Record<string, number> = {}
    entities.forEach(e => {
      counts[e.integration] = (counts[e.integration] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [entities])

  const statusStats = useMemo(() => {
    const online = entities.filter(e => e.online).length
    const offline = entities.filter(e => !e.online).length
    return [
      { name: 'Online', value: online, color: '#4a9f6e' },
      { name: 'Offline', value: offline, color: '#e05252' }
    ]
  }, [entities])

  const typStats = useMemo(() => {
    const counts: Record<string, number> = {}
    entities.forEach(e => {
      if (e.typ) {
        counts[e.typ] = (counts[e.typ] || 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [entities])

  const floorStats = useMemo(() => {
    const counts: Record<string, number> = {}
    entities.forEach(e => {
      if (e.floor !== '—') {
        counts[e.floor] = (counts[e.floor] || 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [entities])

  const hueStats = useMemo(() => {
    const typCounts: Record<string, number> = {}
    hueEntities.forEach(e => {
      const key = e.typ || 'Ohne Typ'
      typCounts[key] = (typCounts[key] || 0) + 1
    })
    return Object.entries(typCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [hueEntities])

  const areaStats = useMemo(() => {
    const counts: Record<string, number> = {}
    entities.forEach(e => {
      if (e.area !== '—') {
        counts[e.area] = (counts[e.area] || 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [entities])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#f5f5f5]">Statistiken</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#a0aec0] mb-4">Geräte pro Integration</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={integrationStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {integrationStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2028', border: '1px solid #2d3748', borderRadius: '4px' }}
                labelStyle={{ color: '#f5f5f5' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#a0aec0] mb-4">Online / Offline</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusStats.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2028', border: '1px solid #2d3748', borderRadius: '4px' }}
                labelStyle={{ color: '#f5f5f5' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#a0aec0] mb-4">Geräte pro Typ</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typStats} layout="vertical">
              <XAxis type="number" stroke="#6b7280" />
              <YAxis type="category" dataKey="name" stroke="#6b7280" width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2028', border: '1px solid #2d3748', borderRadius: '4px' }}
                labelStyle={{ color: '#f5f5f5' }}
              />
              <Bar dataKey="value" fill="#4fc3f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#a0aec0] mb-4">Geräte pro Bereich</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={floorStats}>
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2028', border: '1px solid #2d3748', borderRadius: '4px' }}
                labelStyle={{ color: '#f5f5f5' }}
              />
              <Bar dataKey="value" fill="#4a9f6e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#a0aec0] mb-4">Top 10 Räume</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={areaStats} layout="vertical">
              <XAxis type="number" stroke="#6b7280" />
              <YAxis type="category" dataKey="name" stroke="#6b7280" width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2028', border: '1px solid #2d3748', borderRadius: '4px' }}
                labelStyle={{ color: '#f5f5f5' }}
              />
              <Bar dataKey="value" fill="#d4a853" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#a0aec0] mb-4">Hue Geräte nach Typ</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={hueStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {hueStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2028', border: '1px solid #2d3748', borderRadius: '4px' }}
                labelStyle={{ color: '#f5f5f5' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <div className="text-sm text-[#6b7280]">Gesamtgeräte</div>
          <div className="text-3xl font-bold text-[#4fc3f7]">{entities.length}</div>
        </div>
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <div className="text-sm text-[#6b7280]">Online</div>
          <div className="text-3xl font-bold text-[#4a9f6e]">{entities.filter(e => e.online).length}</div>
        </div>
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <div className="text-sm text-[#6b7280]">Offline</div>
          <div className="text-3xl font-bold text-[#e05252]">{entities.filter(e => !e.online).length}</div>
        </div>
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-6">
          <div className="text-sm text-[#6b7280]">Hue Geräte</div>
          <div className="text-3xl font-bold text-[#d4a853]">{hueEntities.length}</div>
        </div>
      </div>
    </div>
  )
}
