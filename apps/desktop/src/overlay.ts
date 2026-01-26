const root = document.getElementById('overlay-root')
const contentEl = document.getElementById('overlay-content')

if (!root || !contentEl) {
  throw new Error('Overlay root elements not found')
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

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
    const position = clamp(style.positionY, 0, 1)
    root.style.top = `${position * 100}vh`
  }
}

const renderContent = (text: string) => {
  contentEl.textContent = text
}

applyStyle({ opacity: 0.9, fontSize: 24, lineHeight: 1.4, positionY: 0.2 })

window.subtitles.onOverlayContent((content) => {
  renderContent(content.text)
})

window.subtitles.onOverlayStyle((style) => {
  applyStyle(style)
})
