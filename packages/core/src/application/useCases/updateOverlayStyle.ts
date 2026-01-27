import {
  normalizeOverlayStyle,
  validateOverlayStyle,
} from '../../domain/overlayStyle'
import type { OverlayStyle } from '../../domain/overlayStyle'
import type { OverlayPort } from '../../ports/overlayPort'
import type { SettingsRepositoryPort } from '../../ports/settingsRepository'
import type { UseCaseResult } from '../result'

export const updateOverlayStyle = async (
  settingsRepository: SettingsRepositoryPort,
  overlay: OverlayPort,
  patch: Partial<OverlayStyle>,
): Promise<UseCaseResult<OverlayStyle>> => {
  const current = await settingsRepository.load()
  const merged = normalizeOverlayStyle({ ...current.overlayStyle, ...patch })
  const validation = validateOverlayStyle(merged)

  if (!validation.ok) {
    return { ok: false, error: 'invalid_overlay_style', issues: validation.issues }
  }

  await settingsRepository.save({ overlayStyle: validation.value })
  await overlay.updateStyle(validation.value)

  return { ok: true, value: validation.value }
}
