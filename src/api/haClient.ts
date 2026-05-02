import type { HAEntity, HADevice, HAArea, HAFloor, HALabel, HAState, WSMessage, WSResult, HACredentials } from '../types'

type PendingRequest = {
  resolve: (result: WSResult) => void
  reject: (error: Error) => void
}

export class HAClient {
  private ws: WebSocket | null = null
  private msgId = 1
  private pendingRequests: Map<number, PendingRequest> = new Map()
  private credentials: HACredentials | null = null
  private onAuthSuccess: (() => void) | null = null
  private onAuthError: ((msg: string) => void) | null = null
  private onConnectionError: ((msg: string) => void) | null = null

  setCallbacks(
    onAuthSuccess: () => void,
    onAuthError: (msg: string) => void,
    onConnectionError: (msg: string) => void
  ) {
    this.onAuthSuccess = onAuthSuccess
    this.onAuthError = onAuthError
    this.onConnectionError = onConnectionError
  }

  connect(credentials: HACredentials): Promise<void> {
    return new Promise((resolve, reject) => {
      this.credentials = credentials
      let url = credentials.url.trim()
      
      if (url.endsWith('/')) {
        url = url.slice(0, -1)
      }

      const wsUrl = url.replace('http', 'ws').replace('https', 'wss') + '/api/websocket'
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        this.handleMessage(msg)
      }
      
      this.ws.onerror = () => {
        this.onConnectionError?.('Verbindung fehlgeschlagen. Überprüfe die URL.')
        reject(new Error('Connection failed'))
      }
      
      this.ws.onopen = () => {
        resolve()
      }
    })
  }

  private handleMessage(msg: WSMessage) {
    if (msg.type === 'auth_required') {
      this.authenticate()
    } else if (msg.type === 'auth_ok') {
      this.onAuthSuccess?.()
    } else if (msg.type === 'auth_invalid') {
      this.onAuthError?.('Authentifizierung fehlgeschlagen!')
    } else if (msg.type === 'result') {
      const result = msg as WSResult
      const pending = this.pendingRequests.get(result.id)
      if (pending) {
        pending.resolve(result)
        this.pendingRequests.delete(result.id)
      }
    }
  }

  private authenticate() {
    if (!this.credentials) return
    this.ws?.send(JSON.stringify({
      type: 'auth',
      access_token: this.credentials.token
    }))
  }

  async sendCommand<T>(type: string, data?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('Not connected'))
        return
      }

      const id = this.msgId++
      const message: WSMessage = { id, type, ...data }
      
      this.pendingRequests.set(id, {
        resolve: (result: WSResult) => {
          if (result.success && result.result) {
            resolve(result.result as T)
          } else {
            reject(new Error('Command failed'))
          }
        },
        reject
      })
      
      this.ws.send(JSON.stringify(message))
    })
  }

  async getEntities(): Promise<HAEntity[]> {
    return this.sendCommand<HAEntity[]>('config/entity_registry/list')
  }

  async getDevices(): Promise<HADevice[]> {
    return this.sendCommand<HADevice[]>('config/device_registry/list')
  }

  async getAreas(): Promise<HAArea[]> {
    return this.sendCommand<HAArea[]>('config/area_registry/list')
  }

  async getFloors(): Promise<HAFloor[]> {
    return this.sendCommand<HAFloor[]>('config/floor_registry/list')
  }

  async getLabels(): Promise<HALabel[]> {
    return this.sendCommand<HALabel[]>('config/label_registry/list')
  }

  async getStates(): Promise<HAState[]> {
    return this.sendCommand<HAState[]>('get_states')
  }

  async updateEntityLabels(entityId: string, labels: string[]): Promise<void> {
    await this.sendCommand('config/entity_registry/update', {
      entity_id: entityId,
      labels
    })
  }

  async updateEntityName(entityId: string, name: string | null): Promise<void> {
    await this.sendCommand('config/entity_registry/update', {
      entity_id: entityId,
      name
    })
  }

  async updateEntityArea(entityId: string, areaId: string | null): Promise<void> {
    await this.sendCommand('config/entity_registry/update', {
      entity_id: entityId,
      area_id: areaId
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.pendingRequests.clear()
  }
}

export const haClient = new HAClient()
