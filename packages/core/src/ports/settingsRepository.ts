import type { OverlayStyle } from '../domain/overlayStyle'

export type AudioCaptureMode = 'mic' | 'system' | 'mixed'

export type AppSettings = {
  overlayStyle: OverlayStyle
  overlayPosition?: {
    x: number
    y: number
  }
  audioMode?: AudioCaptureMode
  hotkey?: string
  saveTranscript?: boolean
  latencyTargetMs?: number
  llmProvider?: 'local' | 'openai'
  llmModel?: string
  llmMode?: 'coaching' | 'direct'
}

export interface SettingsRepositoryPort {
  load: () => Promise<AppSettings>
  save: (settings: AppSettings) => Promise<void>
}
