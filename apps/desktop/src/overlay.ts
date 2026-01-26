const root = document.getElementById('overlay-root')
const contentEl = document.getElementById('overlay-content')

if (!root || !contentEl) {
  throw new Error('Overlay root elements not found')
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

let currentPositionY = 0.2

const applyPosition = () => {
  const contentHeight = contentEl.getBoundingClientRect().height
  const viewportHeight = window.innerHeight
  const maxTop = Math.max(0, viewportHeight - contentHeight - 16)
  const top = Math.round(maxTop * currentPositionY)
  root.style.top = `${top}px`
}

const applyStyle = (style: Partial<{
  opacity: number
  fontSize: number
  lineHeight: number
  positionY: number
}>) => {
  if (style.opacity !== undefined) {
    const opacity = clamp(style.opacity, 0, 1)
    document.documentElement.style.setProperty('--overlay-opacity', `${opacity}`)
  }
  if (style.fontSize !== undefined) {
    const size = clamp(style.fontSize, 12, 72)
    document.documentElement.style.setProperty('--overlay-font-size', `${size}px`)
  }
  if (style.lineHeight !== undefined) {
    const lineHeight = clamp(style.lineHeight, 1, 2)
    document.documentElement.style.setProperty('--overlay-line-height', `${lineHeight}`)
  }
  if (style.positionY !== undefined) {
    currentPositionY = clamp(style.positionY, 0, 1)
    applyPosition()
  }
}

const renderContent = (text: string) => {
  contentEl.textContent = text
  requestAnimationFrame(() => {
    applyPosition()
  })
}

applyStyle({ opacity: 0.9, fontSize: 24, lineHeight: 1.4, positionY: 0.2 })
window.addEventListener('resize', applyPosition)

window.subtitles.onOverlayContent((content) => {
  renderContent(content.text)
})

window.subtitles.onOverlayStyle((style) => {
  applyStyle(style)
})
