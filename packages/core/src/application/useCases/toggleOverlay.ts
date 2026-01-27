import type { OverlayPort } from '../../ports/overlayPort'
import type { UseCaseResult } from '../result'

export const toggleOverlay = async (
  overlay: OverlayPort,
  enabled: boolean,
): Promise<UseCaseResult<void>> => {
  if (enabled) {
    await overlay.show()
  } else {
    await overlay.hide()
  }

  return { ok: true, value: undefined }
}
