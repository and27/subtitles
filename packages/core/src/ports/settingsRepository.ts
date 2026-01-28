import type { OverlayStyle } from '../domain/overlayStyle'

export type AudioCaptureMode = 'mic' | 'system' | 'mixed'

export type AppSettings = {
  overlayStyle: OverlayStyle
  audioMode?: AudioCaptureMode
  hotkey?: string
  saveTranscript?: boolean
  latencyTargetMs?: number
  llmProvider?: 'local' | 'openai'
  llmModel?: string
}

export interface SettingsRepositoryPort {
  load: () => Promise<AppSettings>
  save: (settings: AppSettings) => Promise<void>
}
