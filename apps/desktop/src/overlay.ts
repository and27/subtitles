const root = document.getElementById('overlay-root')
const contentEl = document.getElementById('overlay-content')
const statusEl = document.getElementById('overlay-status')

if (!root || !contentEl || !statusEl) {
  throw new Error('Overlay root elements not found')
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

let currentPositionY = 0.2
let dragEnabled = false
let dragPosition: { x: number; y: number } | null = null
let dragOffset = { x: 0, y: 0 }
let isDragging = false

const applyPosition = () => {
  if (dragPosition) {
    root.style.left = `${dragPosition.x}px`
    root.style.top = `${dragPosition.y}px`
    root.style.transform = 'none'
    return
  }
  const contentHeight = contentEl.getBoundingClientRect().height
  const viewportHeight = window.innerHeight
  const maxTop = Math.max(0, viewportHeight - contentHeight - 16)
  const top = Math.round(maxTop * currentPositionY)
  root.style.top = `${top}px`
  root.style.left = '50%'
  root.style.transform = 'translateX(-50%)'
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

const renderListeningState = (active: boolean) => {
  statusEl.textContent = active ? 'Listening' : 'Idle'
  statusEl.dataset.state = active ? 'listening' : 'idle'
}

applyStyle({ opacity: 0.9, fontSize: 24, lineHeight: 1.4, positionY: 0.2 })
window.addEventListener('resize', applyPosition)
window.subtitles.listening.getState().then((state) => {
  renderListeningState(state.active)
})

window.subtitles.onOverlayContent((content) => {
  renderContent(content.text)
})

window.subtitles.onOverlayStyle((style) => {
  applyStyle(style)
})

const clampDragPosition = (x: number, y: number) => {
  const rect = root.getBoundingClientRect()
  const maxX = Math.max(0, window.innerWidth - rect.width - 8)
  const maxY = Math.max(0, window.innerHeight - rect.height - 8)
  return {
    x: clamp(x, 8, maxX),
    y: clamp(y, 8, maxY),
  }
}

const handlePointerDown = (event: PointerEvent) => {
  if (!dragEnabled) {
    return
  }
  isDragging = true
  const rect = root.getBoundingClientRect()
  dragOffset = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  root.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!dragEnabled || !isDragging) {
    return
  }
  const next = clampDragPosition(
    event.clientX - dragOffset.x,
    event.clientY - dragOffset.y,
  )
  dragPosition = next
  applyPosition()
}

const handlePointerUp = (event: PointerEvent) => {
  if (!dragEnabled || !isDragging) {
    return
  }
  isDragging = false
  root.releasePointerCapture(event.pointerId)
  if (dragPosition) {
    window.subtitles.overlay.setPosition(dragPosition)
  }
}

root.addEventListener('pointerdown', handlePointerDown)
root.addEventListener('pointermove', handlePointerMove)
root.addEventListener('pointerup', handlePointerUp)
root.addEventListener('pointerleave', handlePointerUp)

window.subtitles.onListeningState((state) => {
  renderListeningState(state.active)
})

window.subtitles.onOverlayPosition((position) => {
  dragPosition = position
  applyPosition()
})

window.subtitles.onOverlayDragMode((enabled) => {
  dragEnabled = enabled
  document.body.classList.toggle('drag-enabled', enabled)
})
