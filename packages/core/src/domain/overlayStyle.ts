import type { DomainIssue, DomainResult } from './validation'

export type OverlayStyle = {
  opacity: number
  fontSize: number
  lineHeight: number
  positionY: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const DEFAULT_OVERLAY_STYLE: OverlayStyle = {
  opacity: 0.9,
  fontSize: 24,
  lineHeight: 1.4,
  positionY: 0.2,
}

export const normalizeOverlayStyle = (input: Partial<OverlayStyle>): OverlayStyle => ({
  opacity: clamp(input.opacity ?? DEFAULT_OVERLAY_STYLE.opacity, 0, 1),
  fontSize: clamp(input.fontSize ?? DEFAULT_OVERLAY_STYLE.fontSize, 12, 72),
  lineHeight: clamp(input.lineHeight ?? DEFAULT_OVERLAY_STYLE.lineHeight, 1, 2),
  positionY: clamp(input.positionY ?? DEFAULT_OVERLAY_STYLE.positionY, 0, 1),
})

export const validateOverlayStyle = (input: OverlayStyle): DomainResult<OverlayStyle> => {
  const issues: DomainIssue[] = []

  if (input.opacity < 0 || input.opacity > 1) {
    issues.push({ field: 'opacity', message: 'opacity must be between 0 and 1' })
  }
  if (input.fontSize < 12 || input.fontSize > 72) {
    issues.push({ field: 'fontSize', message: 'fontSize must be between 12 and 72' })
  }
  if (input.lineHeight < 1 || input.lineHeight > 2) {
    issues.push({ field: 'lineHeight', message: 'lineHeight must be between 1 and 2' })
  }
  if (input.positionY < 0 || input.positionY > 1) {
    issues.push({ field: 'positionY', message: 'positionY must be between 0 and 1' })
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, value: input }
}
