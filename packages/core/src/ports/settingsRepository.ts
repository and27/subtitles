import type { OverlayStyle } from '../domain/overlayStyle'

export type AppSettings = {
  overlayStyle: OverlayStyle
}

export interface SettingsRepositoryPort {
  load: () => Promise<AppSettings>
  save: (settings: AppSettings) => Promise<void>
}
