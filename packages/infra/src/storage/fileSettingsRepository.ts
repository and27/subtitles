import type { AppSettings } from 'core'
import type { SettingsRepositoryPort } from 'core'
import { loadStore, saveStore, type StoreLogger } from './store'

export class FileSettingsRepository implements SettingsRepositoryPort {
  private filePath: string
  private logger?: StoreLogger

  constructor(filePath: string, logger?: StoreLogger) {
    this.filePath = filePath
    this.logger = logger
  }

  async load(): Promise<AppSettings> {
    const data = await loadStore(this.filePath, this.logger)
    return { overlayStyle: data.overlayStyle }
  }

  async save(settings: AppSettings): Promise<void> {
    const data = await loadStore(this.filePath, this.logger)
    data.overlayStyle = settings.overlayStyle
    await saveStore(this.filePath, data)
  }
}
