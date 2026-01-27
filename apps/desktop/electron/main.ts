import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  IPC_CHANNELS,
  type OverlayContent,
  type OverlayStyle,
  type Scaffold,
  type AppSettings,
  type ListeningState,
} from '../ipc/contracts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let overlayWin: BrowserWindow | null

let overlayClickThrough = true

const defaultOverlayStyle: OverlayStyle = {
  opacity: 0.9,
  fontSize: 24,
  lineHeight: 1.4,
  positionY: 0.2,
}

const defaultSettings: AppSettings = {
  overlayStyle: defaultOverlayStyle,
  activeScaffoldId: null,
  hotkey: 'CommandOrControl+Shift+Space',
}

let appSettings: AppSettings = { ...defaultSettings }
let listeningState: ListeningState = {
  active: false,
}
let registeredHotkey: string | null = null
let overlayVisibilityBeforeListening: boolean | null = null

const broadcastListeningState = () => {
  win?.webContents.send(IPC_CHANNELS.listening.state, listeningState)
  overlayWin?.webContents.send(IPC_CHANNELS.listening.state, listeningState)
}

const startAudioCapture = () => {
  console.log('[audio] start capture')
}

const stopAudioCapture = () => {
  console.log('[audio] stop capture')
}

const setListening = (active: boolean, source: 'hotkey' | 'ui') => {
  if (listeningState.active === active) {
    return
  }

  if (active) {
    overlayVisibilityBeforeListening = overlayWin?.isVisible() ?? false
    overlayWin?.showInactive()
    startAudioCapture()
  } else {
    stopAudioCapture()
    if (overlayVisibilityBeforeListening === false) {
      overlayWin?.hide()
    }
    overlayVisibilityBeforeListening = null
  }

  listeningState = {
    active,
    source,
  }
  broadcastListeningState()
}

const toggleListening = (source: 'hotkey' | 'ui') => {
  setListening(!listeningState.active, source)
}

const registerGlobalHotkey = () => {
  if (registeredHotkey) {
    globalShortcut.unregister(registeredHotkey)
    registeredHotkey = null
  }

  if (!appSettings.hotkey) {
    return
  }

  const success = globalShortcut.register(appSettings.hotkey, () => {
    toggleListening('hotkey')
  })

  if (!success) {
    console.warn(`[hotkey] failed to register: ${appSettings.hotkey}`)
    return
  }

  registeredHotkey = appSettings.hotkey
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('closed', () => {
    overlayWin?.close()
    overlayWin = null
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createOverlayWindow() {
  const bounds = screen.getPrimaryDisplay().workArea
  overlayWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWin.setIgnoreMouseEvents(overlayClickThrough, { forward: true })

  if (VITE_DEV_SERVER_URL) {
    const overlayUrl = new URL('overlay.html', VITE_DEV_SERVER_URL)
    overlayWin.loadURL(overlayUrl.toString())
  } else {
    overlayWin.loadFile(path.join(RENDERER_DIST, 'overlay.html'))
  }

  overlayWin.on('closed', () => {
    overlayWin = null
  })

  screen.on('display-metrics-changed', () => {
    if (!overlayWin) {
      return
    }
    const nextBounds = screen.getPrimaryDisplay().workArea
    overlayWin.setBounds(nextBounds)
  })
}

function registerIpcHandlers() {
  ipcMain.on(IPC_CHANNELS.overlay.show, () => {
    overlayWin?.showInactive()
  })
  ipcMain.on(IPC_CHANNELS.overlay.hide, () => {
    overlayWin?.hide()
  })
  ipcMain.on(IPC_CHANNELS.overlay.updateContent, (_event, content: OverlayContent) => {
    overlayWin?.webContents.send(IPC_CHANNELS.overlay.content, content)
  })
  ipcMain.on(IPC_CHANNELS.overlay.updateStyle, (_event, style: Partial<OverlayStyle>) => {
    appSettings = { ...appSettings, overlayStyle: { ...appSettings.overlayStyle, ...style } }
    overlayWin?.webContents.send(IPC_CHANNELS.overlay.style, style)
  })
  ipcMain.on(IPC_CHANNELS.overlay.setClickThrough, (_event, enabled: boolean) => {
    overlayClickThrough = enabled
    overlayWin?.setIgnoreMouseEvents(overlayClickThrough, { forward: true })
  })

  ipcMain.on(IPC_CHANNELS.listening.start, () => setListening(true, 'ui'))
  ipcMain.on(IPC_CHANNELS.listening.stop, () => setListening(false, 'ui'))
  ipcMain.on(IPC_CHANNELS.listening.toggle, () => toggleListening('ui'))
  ipcMain.handle(IPC_CHANNELS.listening.getState, async () => listeningState)

  ipcMain.handle(IPC_CHANNELS.scaffolds.list, async () => [] as Scaffold[])
  ipcMain.handle(IPC_CHANNELS.scaffolds.upsert, async (_event, scaffold: Scaffold) => scaffold)
  ipcMain.handle(IPC_CHANNELS.scaffolds.delete, async () => undefined)
  ipcMain.handle(IPC_CHANNELS.scaffolds.setActive, async () => undefined)

  ipcMain.handle(
    IPC_CHANNELS.settings.load,
    async () => appSettings,
  )
  ipcMain.handle(IPC_CHANNELS.settings.save, async (_event, next: AppSettings) => {
    const prevHotkey = appSettings.hotkey
    appSettings = { ...appSettings, ...next }

    if (appSettings.hotkey !== prevHotkey) {
      registerGlobalHotkey()
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
    overlayWin = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
    createOverlayWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  createOverlayWindow()
  registerGlobalHotkey()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
