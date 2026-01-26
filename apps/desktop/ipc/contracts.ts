export const IPC_CHANNELS = {
  overlay: {
    show: 'overlay:show',
    hide: 'overlay:hide',
    updateContent: 'overlay:updateContent',
    updateStyle: 'overlay:updateStyle',
    setClickThrough: 'overlay:setClickThrough',
    content: 'overlay:content',
    style: 'overlay:style',
  },
  scaffolds: {
    list: 'scaffolds:list',
    upsert: 'scaffolds:upsert',
    delete: 'scaffolds:delete',
    setActive: 'scaffolds:setActive',
  },
  settings: {
    load: 'settings:load',
    save: 'settings:save',
  },
} as const

export type OverlayContent = {
  text: string
}

export type OverlayStyle = {
  opacity: number
  fontSize: number
  lineHeight: number
  positionY: number
}

export type Scaffold = {
  id: string
  triggers: string[]
  structure: string[]
  starterPhrases: string[]
  tags?: string[]
}

export type AppSettings = {
  overlayStyle: OverlayStyle
  activeScaffoldId: string | null
}

export type Unsubscribe = () => void

export type OverlayContentListener = (content: OverlayContent) => void
export type OverlayStyleListener = (style: Partial<OverlayStyle>) => void

export interface SubtitlesAPI {
  overlay: {
    show: () => void
    hide: () => void
    updateContent: (content: OverlayContent) => void
    updateStyle: (style: Partial<OverlayStyle>) => void
    setClickThrough: (enabled: boolean) => void
  }
  scaffolds: {
    list: () => Promise<Scaffold[]>
    upsert: (scaffold: Scaffold) => Promise<Scaffold>
    delete: (id: string) => Promise<void>
    setActive: (id: string) => Promise<void>
  }
  settings: {
    load: () => Promise<AppSettings>
    save: (settings: AppSettings) => Promise<void>
  }
  onOverlayContent: (listener: OverlayContentListener) => Unsubscribe
  onOverlayStyle: (listener: OverlayStyleListener) => Unsubscribe
}
