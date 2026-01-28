import type { AppSettings } from 'core'
import type { SettingsRepositoryPort } from 'core'
import { loadStore, updateStore, type StoreLogger } from './store'

export class FileSettingsRepository implements SettingsRepositoryPort {
  private filePath: string
  private logger?: StoreLogger

  constructor(filePath: string, logger?: StoreLogger) {
    this.filePath = filePath
    this.logger = logger
  }

  async load(): Promise<AppSettings> {
    const data = await loadStore(this.filePath, this.logger)
    return {
      overlayStyle: data.overlayStyle,
      audioMode: data.audioMode,
      hotkey: data.hotkey,
      saveTranscript: data.saveTranscript,
      latencyTargetMs: data.latencyTargetMs,
      llmProvider: data.llmProvider,
      llmModel: data.llmModel,
      llmMode: data.llmMode,
    }
  }

  async save(settings: AppSettings): Promise<void> {
    await updateStore(
      this.filePath,
      (data) => {
        data.overlayStyle = settings.overlayStyle
        if (settings.audioMode) {
          data.audioMode = settings.audioMode
        }
        if (settings.hotkey) {
          data.hotkey = settings.hotkey
        }
        if (settings.saveTranscript !== undefined) {
          data.saveTranscript = settings.saveTranscript
        }
        if (settings.latencyTargetMs) {
          data.latencyTargetMs = settings.latencyTargetMs
        }
        if (settings.llmProvider) {
          data.llmProvider = settings.llmProvider
        }
        if (settings.llmModel) {
          data.llmModel = settings.llmModel
        }
        if (settings.llmMode) {
          data.llmMode = settings.llmMode
        }
      },
      this.logger,
    )
  }
}
