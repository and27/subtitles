import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  type OverlayContent,
  type OverlayStyle,
  type Scaffold,
  type AppSettings,
  type ListeningState,
  type SubtitlesAPI,
} from '../ipc/contracts'

const subtitles: SubtitlesAPI = {
  overlay: {
    show: () => ipcRenderer.send(IPC_CHANNELS.overlay.show),
    hide: () => ipcRenderer.send(IPC_CHANNELS.overlay.hide),
    updateContent: (content: OverlayContent) =>
      ipcRenderer.send(IPC_CHANNELS.overlay.updateContent, content),
    updateStyle: (style: Partial<OverlayStyle>) =>
      ipcRenderer.send(IPC_CHANNELS.overlay.updateStyle, style),
    setClickThrough: (enabled: boolean) =>
      ipcRenderer.send(IPC_CHANNELS.overlay.setClickThrough, enabled),
  },
  scaffolds: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.scaffolds.list),
    upsert: (scaffold: Scaffold) =>
      ipcRenderer.invoke(IPC_CHANNELS.scaffolds.upsert, scaffold),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.scaffolds.delete, id),
    setActive: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.scaffolds.setActive, id),
  },
  settings: {
    load: () => ipcRenderer.invoke(IPC_CHANNELS.settings.load),
    save: (settings: AppSettings) =>
      ipcRenderer.invoke(IPC_CHANNELS.settings.save, settings),
  },
  listening: {
    start: () => ipcRenderer.send(IPC_CHANNELS.listening.start),
    stop: () => ipcRenderer.send(IPC_CHANNELS.listening.stop),
    toggle: () => ipcRenderer.send(IPC_CHANNELS.listening.toggle),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.listening.getState),
  },
  onOverlayContent: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, content: OverlayContent) =>
      listener(content)
    ipcRenderer.on(IPC_CHANNELS.overlay.content, handler)
    return () => ipcRenderer.off(IPC_CHANNELS.overlay.content, handler)
  },
  onOverlayStyle: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, style: Partial<OverlayStyle>) =>
      listener(style)
    ipcRenderer.on(IPC_CHANNELS.overlay.style, handler)
    return () => ipcRenderer.off(IPC_CHANNELS.overlay.style, handler)
  },
  onListeningState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ListeningState) =>
      listener(state)
    ipcRenderer.on(IPC_CHANNELS.listening.state, handler)
    return () => ipcRenderer.off(IPC_CHANNELS.listening.state, handler)
  },
}

contextBridge.exposeInMainWorld('subtitles', subtitles)
