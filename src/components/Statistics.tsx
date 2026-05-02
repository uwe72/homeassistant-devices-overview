import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { useHA } from '../context/HAContext'

const COLORS = ['#0A84FF', '#30D158', '#FFD60A', '#FF453A', '#BF5AF2', '#FF9F0A', '#64D2FF', '#FFD60A']

export default function Statistics() {
  const { entities } = useHA()

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
      { name: 'Online', value: online, color: '#30D158' },
      { name: 'Offline', value: offline, color: '#FF453A' }
    ]
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#ffffff]">Statistiken</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#9a9a9a] mb-4">Geräte pro Integration</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={integrationStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {integrationStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: '4px' }}
                labelStyle={{ color: '#ffffff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#9a9a9a] mb-4">Online / Offline</h2>
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
                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: '4px' }}
                labelStyle={{ color: '#ffffff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#9a9a9a] mb-4">Geräte pro Bereich</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={floorStats}>
              <XAxis dataKey="name" stroke="#4a4a4a" />
              <YAxis stroke="#4a4a4a" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: '4px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Bar dataKey="value" fill="#30D158" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
