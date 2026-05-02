import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { haClient } from '../api/haClient'
import type { HACredentials, EntityData, HAArea, HAFloor, HALabel, HAEntity, HADevice, HAState } from '../types'

interface HAContextType {
  isConnected: boolean
  isLoading: boolean
  error: string | null
  credentials: HACredentials | null
  entities: EntityData[]
  hueEntities: EntityData[]
  areas: HAArea[]
  floors: HAFloor[]
  typLabels: HALabel[]
  connect: (creds: HACredentials) => Promise<void>
  disconnect: () => void
  refreshData: () => Promise<void>
  updateEntityLabels: (entityId: string, labels: string[]) => Promise<void>
  updateEntityName: (entityId: string, name: string | null) => Promise<void>
  updateEntityArea: (entityId: string, areaId: string | null) => Promise<void>
}

const HAContext = createContext<HAContextType | null>(null)

const INTEGRATION_MAP: Record<string, string> = {
  'hue': 'Philips Hue',
  'zha': 'ZHA',
  'mqtt': 'Zigbee2MQTT',
  'shelly': 'Shelly',
  'esphome': 'ESPHome',
  'homematic': 'Homematic',
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
  const [hueEntities, setHueEntities] = useState<EntityData[]>([])
  const [areas, setAreas] = useState<HAArea[]>([])
  const [floors, setFloors] = useState<HAFloor[]>([])
  const [typLabels, setTypLabels] = useState<HALabel[]>([])

  const processEntityData = useCallback((
    entityList: HAEntity[],
    deviceMap: Record<string, HADevice>,
    areaMap: Record<string, HAArea>,
    floorMap: Record<string, HAFloor>,
    stateMap: Record<string, HAState>,
    labelRegistry: HALabel[]
  ): { main: EntityData[], hue: EntityData[] } => {
    const mainData: EntityData[] = []
    const hueData: EntityData[] = []

    entityList.forEach(e => {
      const state = stateMap[e.entity_id] || {}
      const device = deviceMap[e.device_id || '']
      const area = areaMap[e.area_id || device?.area_id || '']
      const floor = floorMap[area?.floor_id || '']

      const labels = e.labels || []
      const isHue = e.platform === 'hue'

      const typLabel = labels.find(l => l && l.startsWith('typ_'))
      const isValidTypLabel = typLabel && labelRegistry.some(l => l.label_id === typLabel)
      const typ = isValidTypLabel && typLabel !== 'typ_ignore' ? typFromLabel(typLabel, labelRegistry) : null
      const hasTypLabel = isValidTypLabel && typLabel !== 'typ_ignore'

      const displayName = e.name || e.original_name || (state.attributes?.friendly_name as string) || e.entity_id
      const isOnline = state.state !== 'unavailable'
      const floorName = floor?.name || '—'
      const areaName = area?.name || '—'

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
        typLabelRaw: isValidTypLabel ? typLabel : null
      }

      if (hasTypLabel) {
        mainData.push(entityObj)
      }

      if (isHue) {
        hueData.push(entityObj)
      }
    })

    return { main: mainData, hue: hueData }
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

      const { main, hue } = processEntityData(entityList, deviceMap, areaMap, floorMap, stateMap, filteredTypLabels)

      setEntities(main)
      setHueEntities(hue)
      setAreas(areaList)
      setFloors(floorList)
      setTypLabels(filteredTypLabels)
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
    setHueEntities([])
    setAreas([])
    setFloors([])
    setTypLabels([])
  }, [])

  const updateEntityLabels = useCallback(async (entityId: string, labels: string[]) => {
    await haClient.updateEntityLabels(entityId, labels)
    
    const updateEntity = (e: EntityData) => {
      if (e.entity_id !== entityId) return e
      const typLabel = labels.find(l => l && l.startsWith('typ_'))
      const typ = typLabel && typLabel !== 'typ_ignore' ? typFromLabel(typLabel, typLabels) : null
      return {
        ...e,
        labels,
        typ,
        typLabelRaw: typLabel || null
      }
    }

    setEntities(prev => prev.map(updateEntity))
    setHueEntities(prev => prev.map(updateEntity))
  }, [typLabels])

  const updateEntityName = useCallback(async (entityId: string, name: string | null) => {
    await haClient.updateEntityName(entityId, name)
    
    const updateEntity = (e: EntityData) => {
      if (e.entity_id !== entityId) return e
      return { ...e, friendly_name: name || e.friendly_name }
    }
    
    setEntities(prev => prev.map(updateEntity))
    setHueEntities(prev => prev.map(updateEntity))
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
    setHueEntities(prev => prev.map(updateEntity))
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
      hueEntities,
      areas,
      floors,
      typLabels,
      connect,
      disconnect,
      refreshData,
      updateEntityLabels,
      updateEntityName,
      updateEntityArea
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
