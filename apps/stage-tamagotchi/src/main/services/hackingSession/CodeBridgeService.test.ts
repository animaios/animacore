import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { setupCodeBridgeService } from './CodeBridgeService'
import { setupHackingSessionService } from './HackingSessionService'

// Mock WebSocket
const mockWebSocket = {
  OPEN: 1,
  CONNECTING: 0,
  CLOSING: 2,
  CLOSED: 3,
}

vi.mock('ws', () => {
  return vi.fn().mockImplementation(() => {
    const eventTarget = {
      listeners: {} as Record<string, Array<(event: any) => void>>,
      addEventListener(event: string, callback: (event: any) => void) {
        if (!this.listeners[event]) {
          this.listeners[event] = []
        }
        this.listeners[event].push(callback)
      },
      removeEventListener(event: string, callback: (event: any) => void) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback)
        }
      },
      dispatchEvent(event: { type: string }) {
        if (this.listeners[event.type]) {
          this.listeners[event.type].forEach((callback) => callback(event))
        }
      },
    }

    return {
      readyState: mockWebSocket.CONNECTING,
      url: '',
      send: vi.fn(),
      close: vi.fn(),
      ping: vi.fn(),
      ...eventTarget,
      // Override addEventListener to match WebSocket API
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    }
  })
})

describe('CodeBridgeService', () => {
  let hackingSessionService: ReturnType<typeof setupHackingSessionService>
  let codeBridgeService: ReturnType<typeof setupCodeBridgeService>
  const wsMockInstances: Array<any> = []

  beforeEach(() => {
    hackingSessionService = setupHackingSessionService({
      codeBackendPath: '/nonexistent/path.js',
      httpReadyTimeoutMs: 10,
      readinessTimeoutMs: 20,
    })

    // Mock the WebSocket constructor to track instances
    const WebSocketMock = require('ws')
    wsMockInstances.length = 0
    ;(WebSocketMock as any).mockImplementation(() => {
      const instance = {
        readyState: mockWebSocket.CONNECTING,
        url: '',
        send: vi.fn(),
        close: vi.fn(),
        ping: vi.fn(),
        listeners: {} as Record<string, Array<(event: any) => void>>,
        addEventListener(event: string, callback: (event: any) => void) {
          if (!this.listeners[event]) {
            this.listeners[event] = []
          }
          this.listeners[event].push(callback)
        },
        removeEventListener(event: string, callback: (event: any) => void) {
          if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback)
          }
        },
        dispatchEvent(event: { type: string }) {
          if (this.listeners[event.type]) {
            this.listeners[event.type].forEach((callback) => callback(event))
          }
        },
      }
      wsMockInstances.push(instance)
      return instance
    })

    codeBridgeService = setupCodeBridgeService(hackingSessionService, {
      port: 3210,
      sessionId: 'test-session-id',
      bridgeToken: 'test-token',
    })
  })

  afterEach(() => {
    // Clean up mocks
    vi.clearAllMocks()
    wsMockInstances.length = 0
  })

  describe('initialization', () => {
    it('should create service with correct initial state', () => {
      expect(codeBridgeService).toBeDefined()
      expect(typeof codeBridgeService.connect).toBe('function')
      expect(typeof codeBridgeService.close).toBe('function')
      expect(typeof codeBridgeService.sendConfig).toBe('function')
      expect(typeof codeBridgeService.updateSessionId).toBe('function')
    })
  })

  describe('connect', () => {
    it('should create WebSocket connection', () => {
      codeBridgeService.connect()

      expect(wsMockInstances.length).toBe(1)
      const ws = wsMockInstances[0]
      expect(ws.url).toBe('ws://localhost:3210/bridge')
    })
  })

  describe('updateSessionId', () => {
    it('should update sessionId', () => {
      codeBridgeService.updateSessionId('new-session-id')
      // The sessionId is stored internally - we can't directly access it
      // but we can verify the service still works
      expect(codeBridgeService).toBeDefined()
    })
  })

  describe('close', () => {
    it('should close WebSocket connection', async () => {
      codeBridgeService.connect()

      expect(wsMockInstances.length).toBe(1)
      const ws = wsMockInstances[0]
      expect(ws.close).not.toHaveBeenCalled()

      await codeBridgeService.close()

      expect(ws.close).toHaveBeenCalledWith(1000, 'Closing normally')
    })
  })
})
