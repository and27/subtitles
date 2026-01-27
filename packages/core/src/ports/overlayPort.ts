import type { OverlayStyle } from '../domain/overlayStyle'

export interface OverlayPort {
  show: () => Promise<void> | void
  hide: () => Promise<void> | void
  updateContent: (content: string) => Promise<void> | void
  updateStyle: (style: Partial<OverlayStyle>) => Promise<void> | void
}
