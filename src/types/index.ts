export interface HAEntity {
  entity_id: string
  name: string | null
  original_name: string | null
  platform: string
  device_id: string | null
  area_id: string | null
  labels: string[]
  unique_id: string | null
  disabled_by: string | null
}

export interface HADevice {
  id: string
  name: string | null
  manufacturer: string | null
  model: string | null
  area_id: string | null
}

export interface HAArea {
  area_id: string
  name: string
  floor_id: string | null
  picture: string | null
}

export interface HAFloor {
  floor_id: string
  name: string
  level: number | null
}

export interface HALabel {
  label_id: string
  name: string
}

export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
}

export interface EntityData {
  entity_id: string
  friendly_name: string
  integration: string
  online: boolean
  state: string
  floor: string
  area: string
  area_id: string | null
  floor_id: string | null
  labels: string[]
  typ: string | null
  typLabelRaw: string | null
}

export interface HACredentials {
  url: string
  token: string
}

export interface WSMessage {
  type: string
  id?: number
  [key: string]: unknown
}

export interface WSResult {
  id: number
  type: 'result'
  success: boolean
  result?: unknown
}

export type FilterState = {
  status: string
  typ: string
  integration: string
  floor: string
  area: string
  [key: string]: string
}

export type IntegrationFilterState = {
  status: string
  typ: string
  integration: string
  configStatus: string
  floor: string
  area: string
  ignore: string
  [key: string]: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: string
  direction: SortDirection
}
