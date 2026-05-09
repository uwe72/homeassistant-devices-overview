import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { haClient } from '../api/haClient'
import type { HACredentials, EntityData, HAArea, HAFloor, HALabel, HAEntity, HADevice, HAState, FilterState, IntegrationFilterState, BatteryFilterState, BatteriesFilterState, SortDirection } from '../types'

interface HAContextType {
  isConnected: boolean
  isLoading: boolean
  error: string | null
  credentials: HACredentials | null
  entities: EntityData[]
  allEntities: EntityData[]
  integrationEntities: EntityData[]
  areas: HAArea[]
  floors: HAFloor[]
  typLabels: HALabel[]
  batterieLabels: HALabel[]
  connect: (creds: HACredentials) => Promise<void>
  disconnect: () => void
  refreshData: () => Promise<void>
  updateEntityLabels: (entityId: string, labels: string[]) => Promise<void>
  updateEntityName: (entityId: string, name: string | null) => Promise<void>
  updateEntityArea: (entityId: string, areaId: string | null) => Promise<void>
  deviceFilters: FilterState
  deviceSearch: string
  deviceSort: { field: string; direction: SortDirection }
  integrationFilters: IntegrationFilterState
  integrationSearch: string
  integrationSort: { field: string; direction: SortDirection }
  setDeviceFilter: (key: string, value: string) => void
  setDeviceSearch: (value: string) => void
  setDeviceSort: (field: string) => void
  setIntegrationFilter: (key: string, value: string) => void
  setIntegrationSearch: (value: string) => void
  setIntegrationSort: (field: string) => void
  batteryFilters: BatteryFilterState
  batterySearch: string
  batterySort: { field: string; direction: SortDirection }
  setBatteryFilter: (key: string, value: string) => void
  setBatterySearch: (value: string) => void
  setBatterySort: (field: string) => void
  batteriesFilters: BatteriesFilterState
  batteriesSearch: string
  batteriesSort: { field: string; direction: SortDirection }
  setBatteriesFilter: (key: string, value: string) => void
  setBatteriesSearch: (value: string) => void
  setBatteriesSort: (field: string) => void
}

const HAContext = createContext<HAContextType | null>(null)

const INTEGRATION_MAP: Record<string, string> = {
  'hue': 'Philips Hue',
  'zha': 'ZHA',
  'mqtt': 'Zigbee2MQTT',
  'shelly': 'Shelly',
  'esphome': 'ESPHome',
  'homematicip_local': 'Homematic IP',
  'homematic': 'Homematic',
  'deconz': 'deCONZ',
  'meross_lan': 'meross_lan',
  'ecovacs': 'ecovacs',
  'remote_homeassistant': 'Remote Home-Assistant',
  'group': 'Gruppe'
}

function typFromLabel(label: string | null, labelRegistry: HALabel[]): string | null {
  if (!label || !label.startsWith('typ_')) return null
  const entry = labelRegistry.find(l => l.label_id === label)
  if (entry) return entry.name
  const raw = label.replace('typ_', '')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function HAProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<HACredentials | null>(null)
  const [entities, setEntities] = useState<EntityData[]>([])
  const [allEntities, setAllEntities] = useState<EntityData[]>([])
  const [integrationEntities, setIntegrationEntities] = useState<EntityData[]>([])
  const [areas, setAreas] = useState<HAArea[]>([])
  const [floors, setFloors] = useState<HAFloor[]>([])
  const [typLabels, setTypLabels] = useState<HALabel[]>([])
  const [batterieLabels, setBatterieLabels] = useState<HALabel[]>([])

  const [deviceFilters, setDeviceFilters] = useState<FilterState>({
    status: 'all',
    typ: 'all',
    integration: 'all',
    floor: 'all',
    area: 'all'
  })
  const [deviceSearch, setDeviceSearch] = useState('')
  const [deviceSort, setDeviceSortState] = useState<{ field: string; direction: SortDirection }>({
    field: 'typ',
    direction: 'asc'
  })

  const [integrationFilters, setIntegrationFilters] = useState<IntegrationFilterState>({
    status: 'all',
    typ: 'all',
    integration: localStorage.getItem('integration_selected') || 'all',
    configStatus: 'all',
    floor: 'all',
    area: 'all',
    ignore: 'hidden'
  })
  const [integrationSearch, setIntegrationSearch] = useState('')
  const [integrationSort, setIntegrationSortState] = useState<{ field: string; direction: SortDirection }>({
    field: 'friendly_name',
    direction: 'asc'
  })

  const [batteryFilters, setBatteryFilters] = useState<BatteryFilterState>({
    status: 'all',
    typ: 'all',
    integration: localStorage.getItem('battery_integration_selected') || 'all',
    configStatus: 'all',
    floor: 'all',
    area: 'all',
    batterie: 'all'
  })
  const [batterySearch, setBatterySearch] = useState('')
  const [batterySortState, setBatterySortState] = useState<{ field: string; direction: SortDirection }>({
    field: 'friendly_name',
    direction: 'asc'
  })

  const [batteriesFilters, setBatteriesFilters] = useState<BatteriesFilterState>({
    status: 'all',
    integration: 'all',
    floor: 'all',
    area: 'all'
  })
  const [batteriesSearch, setBatteriesSearch] = useState('')
  const [batteriesSortState, setBatteriesSortState] = useState<{ field: string; direction: SortDirection }>({
    field: 'batteryLevel',
    direction: 'asc'
  })

  const setDeviceFilter = useCallback((key: string, value: string) => {
    setDeviceFilters(prev => {
      if (key === 'floor') {
        return { ...prev, [key]: value, area: 'all' }
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const setDeviceSort = useCallback((field: string) => {
    setDeviceSortState(prev => ({
      field,
      direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
  }, [])

  const setIntegrationFilter = useCallback((key: string, value: string) => {
    if (key === 'integration') {
      localStorage.setItem('integration_selected', value)
    }
    setIntegrationFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const setIntegrationSort = useCallback((field: string) => {
    setIntegrationSortState(prev => ({
      field,
      direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
  }, [])

  const setBatteryFilter = useCallback((key: string, value: string) => {
    if (key === 'integration') {
      localStorage.setItem('battery_integration_selected', value)
    }
    setBatteryFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const setBatterySort = useCallback((field: string) => {
    setBatterySortState(prev => ({
      field,
      direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
  }, [])

  const setBatteriesFilter = useCallback((key: string, value: string) => {
    setBatteriesFilters(prev => {
      if (key === 'floor') {
        return { ...prev, [key]: value, area: 'all' }
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const setBatteriesSort = useCallback((field: string) => {
    setBatteriesSortState(prev => ({
      field,
      direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
  }, [])

  const processEntityData = useCallback((
    entityList: HAEntity[],
    deviceMap: Record<string, HADevice>,
    areaMap: Record<string, HAArea>,
    floorMap: Record<string, HAFloor>,
    stateMap: Record<string, HAState>,
    labelRegistry: HALabel[]
  ): { main: EntityData[], integration: EntityData[], all: EntityData[] } => {
    const mainData: EntityData[] = []
    const integrationData: EntityData[] = []
    const allData: EntityData[] = []

    entityList.forEach(e => {
      const state = stateMap[e.entity_id] || {}
      const device = deviceMap[e.device_id || '']
      const area = areaMap[e.area_id || device?.area_id || '']
      const floor = floorMap[area?.floor_id || '']

      const labels = e.labels || []
      const isAllowedIntegration = [
        'hue',
        'shelly',
        'homematicip_local',
        'homematic',
        'deconz',
        'meross_lan',
        'ecovacs',
        'remote_homeassistant'
      ].includes(e.platform)

      const typLabel = labels.find(l => l && l.startsWith('typ_'))
      const isValidTypLabel = typLabel && labelRegistry.some(l => l.label_id === typLabel)
      const typ = isValidTypLabel && typLabel !== 'typ_ignore' ? typFromLabel(typLabel, labelRegistry) : null
      const hasTypLabel = isValidTypLabel && typLabel !== 'typ_ignore'

      const displayName = e.name || e.original_name || (state.attributes?.friendly_name as string) || e.entity_id
      const isOnline = state.state !== 'unavailable'
      const floorName = floor?.name || '—'
      const areaName = area?.name || '—'

      const stateNum = parseFloat(state.state)
      let batteryLevel: number | null = null

      const isLowBatSensor = state.attributes?.parameter === 'LOW_BAT'

      if (!isNaN(stateNum) && stateNum >= 0 && stateNum <= 100) {
        batteryLevel = stateNum
      } else if (isLowBatSensor) {
        batteryLevel = state.state === 'on' ? 5 : 100
      } else if (state.state === 'on' || state.state === 'true') {
        batteryLevel = 100
      } else if (typeof state.attributes?.battery_level === 'number') {
        batteryLevel = state.attributes.battery_level
      }

      const entityObj: EntityData = {
        entity_id: e.entity_id,
        friendly_name: displayName,
        integration: INTEGRATION_MAP[e.platform] || e.platform,
        online: isOnline,
        state: state.state,
        floor: floorName,
        area: areaName,
        area_id: e.area_id || device?.area_id || null,
        floor_id: area?.floor_id || null,
        labels,
        typ,
        typLabelRaw: isValidTypLabel ? typLabel : null,
        batteryLevel
      }

      allData.push(entityObj)

      if (hasTypLabel) {
        mainData.push(entityObj)
      }

      if (isAllowedIntegration) {
        integrationData.push(entityObj)
      }
    })

    return { main: mainData, integration: integrationData, all: allData }
  }, [])

  const refreshData = useCallback(async () => {
    if (!isConnected) return

    setIsLoading(true)
    try {
      const [entityList, deviceList, areaList, floorList, labelList, stateList] = await Promise.all([
        haClient.getEntities(),
        haClient.getDevices(),
        haClient.getAreas(),
        haClient.getFloors(),
        haClient.getLabels(),
        haClient.getStates()
      ])

      const deviceMap: Record<string, HADevice> = {}
      deviceList.forEach(d => { deviceMap[d.id] = d })

      const areaMap: Record<string, HAArea> = {}
      areaList.forEach(a => { areaMap[a.area_id] = a })

      const floorMap: Record<string, HAFloor> = {}
      floorList.forEach(f => { floorMap[f.floor_id] = f })

      const stateMap: Record<string, HAState> = {}
      stateList.forEach(s => { stateMap[s.entity_id] = s })

      const filteredTypLabels = labelList.filter(l => l.label_id.startsWith('typ_'))
      const filteredBatterieLabels = labelList.filter(l => l.label_id.startsWith('batterie_'))

      const { main, integration, all } = processEntityData(entityList, deviceMap, areaMap, floorMap, stateMap, filteredTypLabels)

      setEntities(main)
      setIntegrationEntities(integration)
      setAllEntities(all)
      setAreas(areaList)
      setFloors(floorList)
      setTypLabels(filteredTypLabels)
      setBatterieLabels(filteredBatterieLabels)
    } catch (err) {
      setError('Fehler beim Laden der Daten')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, processEntityData])

  const connect = useCallback(async (creds: HACredentials) => {
    setIsLoading(true)
    setError(null)

    haClient.setCallbacks(
      () => {
        setIsConnected(true)
        setCredentials(creds)
        localStorage.setItem('ha_url', creds.url)
        localStorage.setItem('ha_token', creds.token)
        refreshData()
      },
      (msg) => {
        setError(msg)
        setIsLoading(false)
      },
      (msg) => {
        setError(msg)
        setIsLoading(false)
      }
    )

    try {
      await haClient.connect(creds)
    } catch (err) {
      setIsLoading(false)
    }
  }, [refreshData])

  const disconnect = useCallback(() => {
    haClient.disconnect()
    setIsConnected(false)
    setCredentials(null)
    setEntities([])
    setAllEntities([])
    setIntegrationEntities([])
    setAreas([])
    setFloors([])
    setTypLabels([])
    setBatterieLabels([])
    setDeviceFilters({
      status: 'all',
      typ: 'all',
      integration: 'all',
      floor: 'all',
      area: 'all'
    })
    setDeviceSearch('')
    setDeviceSortState({ field: 'typ', direction: 'asc' })
    setIntegrationFilters({
      status: 'all',
      typ: 'all',
      integration: 'all',
      configStatus: 'all',
      floor: 'all',
      area: 'all',
      ignore: 'hidden'
    })
    setIntegrationSearch('')
    setIntegrationSortState({ field: 'friendly_name', direction: 'asc' })
    setBatteryFilters({
      status: 'all',
      typ: 'all',
      integration: 'all',
      configStatus: 'all',
      floor: 'all',
      area: 'all',
      batterie: 'all'
    })
    setBatterySearch('')
    setBatterySortState({ field: 'friendly_name', direction: 'asc' })
    setBatteriesFilters({
      status: 'all',
      integration: 'all',
      floor: 'all',
      area: 'all'
    })
    setBatteriesSearch('')
    setBatteriesSortState({ field: 'batteryLevel', direction: 'asc' })
  }, [])

  const updateEntityLabels = useCallback(async (entityId: string, labels: string[]) => {
    await haClient.updateEntityLabels(entityId, labels)

    const typLabel = labels.find(l => l && l.startsWith('typ_'))
    const typ = typLabel && typLabel !== 'typ_ignore' ? typFromLabel(typLabel, typLabels) : null
    const typLabelRaw = typLabel || null

    setEntities(prev => {
      if (typLabel === 'typ_ignore') {
        return prev.filter(e => e.entity_id !== entityId)
      }
      return prev.map(e => e.entity_id === entityId ? { ...e, labels, typ, typLabelRaw } : e)
    })
    setIntegrationEntities(prev => prev.map(e => e.entity_id === entityId ? { ...e, labels, typ, typLabelRaw } : e))
    setAllEntities(prev => prev.map(e => e.entity_id === entityId ? { ...e, labels, typ, typLabelRaw } : e))
  }, [typLabels])

  const updateEntityName = useCallback(async (entityId: string, name: string | null) => {
    await haClient.updateEntityName(entityId, name)
    
    const updateEntity = (e: EntityData) => {
      if (e.entity_id !== entityId) return e
      return { ...e, friendly_name: name || e.friendly_name }
    }
    
    setEntities(prev => prev.map(updateEntity))
    setIntegrationEntities(prev => prev.map(updateEntity))
    setAllEntities(prev => prev.map(updateEntity))
  }, [])

  const updateEntityArea = useCallback(async (entityId: string, areaId: string | null) => {
    await haClient.updateEntityArea(entityId, areaId)
    
    const updateEntity = (e: EntityData) => {
      if (e.entity_id !== entityId) return e
      const area = areas.find(a => a.area_id === areaId)
      const floor = area ? floors.find(f => f.floor_id === area.floor_id) : null
      return {
        ...e,
        area_id: areaId,
        area: area?.name || '—',
        floor_id: area?.floor_id || null,
        floor: floor?.name || '—'
      }
    }
    
    setEntities(prev => prev.map(updateEntity))
    setIntegrationEntities(prev => prev.map(updateEntity))
    setAllEntities(prev => prev.map(updateEntity))
  }, [areas, floors])

  useEffect(() => {
    const savedUrl = localStorage.getItem('ha_url')
    const savedToken = localStorage.getItem('ha_token')
    if (savedUrl && savedToken) {
      connect({ url: savedUrl, token: savedToken })
    }
  }, [connect])

  return (
    <HAContext.Provider value={{
      isConnected,
      isLoading,
      error,
      credentials,
      entities,
      allEntities,
      integrationEntities,
      areas,
      floors,
      typLabels,
      batterieLabels,
      connect,
      disconnect,
      refreshData,
      updateEntityLabels,
      updateEntityName,
      updateEntityArea,
      deviceFilters,
      deviceSearch,
      deviceSort,
      integrationFilters,
      integrationSearch,
      integrationSort,
      setDeviceFilter,
      setDeviceSearch,
      setDeviceSort,
      setIntegrationFilter,
      setIntegrationSearch,
      setIntegrationSort,
      batteryFilters,
      batterySearch,
      batterySort: batterySortState,
      setBatteryFilter,
      setBatterySearch,
      setBatterySort,
      batteriesFilters,
      batteriesSearch,
      batteriesSort: batteriesSortState,
      setBatteriesFilter,
      setBatteriesSearch,
      setBatteriesSort
    }}>
      {children}
    </HAContext.Provider>
  )
}

export function useHA() {
  const context = useContext(HAContext)
  if (!context) {
    throw new Error('useHA must be used within HAProvider')
  }
  return context
}
