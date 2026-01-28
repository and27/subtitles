export const IPC_CHANNELS = {
  overlay: {
    show: 'overlay:show',
    hide: 'overlay:hide',
    updateContent: 'overlay:updateContent',
    updateStyle: 'overlay:updateStyle',
    setClickThrough: 'overlay:setClickThrough',
    setDragMode: 'overlay:setDragMode',
    setPosition: 'overlay:setPosition',
    content: 'overlay:content',
    style: 'overlay:style',
    dragMode: 'overlay:dragMode',
    position: 'overlay:position',
  },
  listening: {
    start: 'listening:start',
    stop: 'listening:stop',
    toggle: 'listening:toggle',
    getState: 'listening:getState',
    state: 'listening:state',
  },
  stt: {
    getConfig: 'stt:getConfig',
    setConfig: 'stt:setConfig',
    simulate: 'stt:simulate',
    manual: 'stt:manual',
    audioChunk: 'stt:audioChunk',
    clear: 'stt:clear',
    transcript: 'stt:transcript',
    getMetrics: 'stt:getMetrics',
    metrics: 'stt:metrics',
    getStatus: 'stt:getStatus',
    status: 'stt:status',
  },
  llm: {
    getConfig: 'llm:getConfig',
    setConfig: 'llm:setConfig',
    generate: 'llm:generate',
  },
  transcript: {
    clearSaved: 'transcript:clearSaved',
  },
  scaffolds: {
    list: 'scaffolds:list',
    upsert: 'scaffolds:upsert',
    delete: 'scaffolds:delete',
    setActive: 'scaffolds:setActive',
  },
  settings: {
    load: 'settings:load',
    save: 'settings:save',
  },
} as const

export type OverlayContent = {
  text: string
}

export type OverlayStyle = {
  opacity: number
  fontSize: number
  lineHeight: number
  positionY: number
}

export type OverlayPosition = {
  x: number
  y: number
}

export type AudioCaptureMode = 'mic' | 'system' | 'mixed'

export type Scaffold = {
  id: string
  triggers: string[]
  structure: string[]
  starterPhrases: string[]
  tags?: string[]
}

export type AppSettings = {
  overlayStyle: OverlayStyle
  activeScaffoldId: string | null
  hotkey: string
  audioMode: AudioCaptureMode
  saveTranscript?: boolean
  latencyTargetMs?: number
  overlayPosition?: OverlayPosition
  llmProvider?: LlmProvider
  llmModel?: string
  llmMode?: LlmMode
}

export type ListeningState = {
  active: boolean
  source?: 'hotkey' | 'ui'
  audioMode: AudioCaptureMode
}

export type SttProvider = 'local' | 'cloud'

export type SttConfig = {
  provider: SttProvider
  cloudApiKey?: string
}

export type SttTranscript = {
  text: string
  isFinal: boolean
  updatedAt: number
}

export type SttAudioChunk = {
  data: ArrayBuffer
  mimeType: string
  isFinal: boolean
}

export type LlmProvider = 'local' | 'openai'

export type LlmMode = 'coaching' | 'direct'

export type LlmConfig = {
  provider: LlmProvider
  model?: string
  apiKey?: string
}

export type LlmRequest = {
  question: string
  mode?: LlmMode
}

export type LlmResponse = {
  text: string
  updatedAt: number
  provider: LlmProvider
}

export type SttMetrics = {
  totalUpdates: number
  lateUpdates: number
  lastUpdateAt: number | null
  lastUpdateIntervalMs: number | null
  avgUpdateIntervalMs: number | null
  dropRate: number
}

export type SttRuntimeStatus = {
  backoffUntil: number | null
  failureCount: number
  lastError?: string
}

export type Unsubscribe = () => void

export type OverlayContentListener = (content: OverlayContent) => void
export type OverlayStyleListener = (style: Partial<OverlayStyle>) => void
export type OverlayPositionListener = (position: OverlayPosition) => void
export type OverlayDragModeListener = (enabled: boolean) => void
export type ListeningStateListener = (state: ListeningState) => void
export type SttTranscriptListener = (transcript: SttTranscript) => void
export type SttMetricsListener = (metrics: SttMetrics) => void
export type SttStatusListener = (status: SttRuntimeStatus) => void

export interface SubtitlesAPI {
  overlay: {
    show: () => void
    hide: () => void
    updateContent: (content: OverlayContent) => void
    updateStyle: (style: Partial<OverlayStyle>) => void
    setClickThrough: (enabled: boolean) => void
    setDragMode: (enabled: boolean) => void
    setPosition: (position: OverlayPosition) => void
  }
  scaffolds: {
    list: () => Promise<Scaffold[]>
    upsert: (scaffold: Scaffold) => Promise<Scaffold>
    delete: (id: string) => Promise<void>
    setActive: (id: string) => Promise<void>
  }
  settings: {
    load: () => Promise<AppSettings>
    save: (settings: AppSettings) => Promise<void>
  }
  listening: {
    start: () => void
    stop: () => void
    toggle: () => void
    getState: () => Promise<ListeningState>
  }
  stt: {
    getConfig: () => Promise<SttConfig>
    setConfig: (config: SttConfig) => Promise<void>
    simulate: (text: string) => void
    manual: (text: string) => void
    audioChunk: (chunk: SttAudioChunk) => void
    clear: () => void
    getMetrics: () => Promise<SttMetrics>
    getStatus: () => Promise<SttRuntimeStatus>
  }
  llm: {
    getConfig: () => Promise<LlmConfig>
    setConfig: (config: LlmConfig) => Promise<void>
    generate: (request: LlmRequest) => Promise<LlmResponse>
  }
  transcript: {
    clearSaved: () => void
  }
  onOverlayContent: (listener: OverlayContentListener) => Unsubscribe
  onOverlayStyle: (listener: OverlayStyleListener) => Unsubscribe
  onOverlayPosition: (listener: OverlayPositionListener) => Unsubscribe
  onOverlayDragMode: (listener: OverlayDragModeListener) => Unsubscribe
  onListeningState: (listener: ListeningStateListener) => Unsubscribe
  onSttTranscript: (listener: SttTranscriptListener) => Unsubscribe
  onSttMetrics: (listener: SttMetricsListener) => Unsubscribe
  onSttStatus: (listener: SttStatusListener) => Unsubscribe
}
