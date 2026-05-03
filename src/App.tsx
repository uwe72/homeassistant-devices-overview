import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HAProvider, useHA } from './context/HAContext'
import Layout from './components/Layout'
import ConfigPanel from './components/ConfigPanel'
import Devices from './pages/Devices'
import Batteries from './pages/Batteries'
import IntegrationsDevices from './pages/IntegrationsDevices'
import Statistics from './pages/Statistics'
import Entities from './pages/Entities'

function AppRoutes() {
  const { isConnected, isLoading } = useHA()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-[#2d3748] border-t-[#4fc3f7] rounded-full animate-spin" />
          <span className="text-[#a0aec0]">Verbinde...</span>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return <ConfigPanel />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Devices />} />
        <Route path="batteries" element={<Batteries />} />
        <Route path="entities" element={<Entities />} />
        <Route path="integrations" element={<IntegrationsDevices />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <HAProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HAProvider>
  )
}

export default App
