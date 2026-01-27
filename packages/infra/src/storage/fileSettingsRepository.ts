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
    return { overlayStyle: data.overlayStyle }
  }

  async save(settings: AppSettings): Promise<void> {
    await updateStore(
      this.filePath,
      (data) => {
        data.overlayStyle = settings.overlayStyle
      },
      this.logger,
    )
  }
}
