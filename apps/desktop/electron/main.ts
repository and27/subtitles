import { app, BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import {
  FileScaffoldRepository,
  FileSettingsRepository,
  type StoreLogger,
} from "infra";
import {
  IPC_CHANNELS,
  type AudioCaptureMode,
  type OverlayContent,
  type OverlayStyle,
  type Scaffold,
  type AppSettings,
  type ListeningState,
  type SttConfig,
  type SttTranscript,
} from "../ipc/contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let overlayWin: BrowserWindow | null;

let overlayClickThrough = true;

const defaultOverlayStyle: OverlayStyle = {
  opacity: 0.9,
  fontSize: 24,
  lineHeight: 1.4,
  positionY: 0.2,
};

const defaultSettings: AppSettings = {
  overlayStyle: defaultOverlayStyle,
  activeScaffoldId: null,
  hotkey: "CommandOrControl+Shift+Space",
  audioMode: "system",
  saveTranscript: false,
};

let appSettings: AppSettings = { ...defaultSettings };
let listeningState: ListeningState = {
  active: false,
  audioMode: defaultSettings.audioMode,
};
let registeredHotkey: string | null = null;
let overlayVisibilityBeforeListening: boolean | null = null;
let sttConfig: SttConfig = {
  provider: "local",
};
let transcriptText = "";
let transcriptTimer: NodeJS.Timeout | null = null;

let scaffoldRepository: FileScaffoldRepository | null = null;
let settingsRepository: FileSettingsRepository | null = null;

const storeLogger: StoreLogger = {
  warn: (message: string) => {
    console.warn(`[storage] ${message}`);
  },
};

const getStorePath = () =>
  path.join(app.getPath("userData"), "subtitles-store.json");
const getTranscriptPath = () =>
  path.join(app.getPath("userData"), "subtitles-transcript.txt");

const ensureRepositories = () => {
  if (!scaffoldRepository || !settingsRepository) {
    const storePath = getStorePath();
    scaffoldRepository = new FileScaffoldRepository(storePath, storeLogger);
    settingsRepository = new FileSettingsRepository(storePath, storeLogger);
  }
};

const hydrateAppSettings = async () => {
  ensureRepositories();
  if (!settingsRepository) {
    return;
  }
  const persisted = await settingsRepository.load();
  appSettings = {
    ...appSettings,
    ...persisted,
  };
  listeningState = {
    ...listeningState,
    audioMode: appSettings.audioMode,
  };
};

const broadcastListeningState = () => {
  win?.webContents.send(IPC_CHANNELS.listening.state, listeningState);
  overlayWin?.webContents.send(IPC_CHANNELS.listening.state, listeningState);
};

const broadcastTranscript = (text: string, isFinal: boolean) => {
  const payload: SttTranscript = {
    text,
    isFinal,
    updatedAt: Date.now(),
  };
  win?.webContents.send(IPC_CHANNELS.stt.transcript, payload);
  overlayWin?.webContents.send(IPC_CHANNELS.stt.transcript, payload);
  if (appSettings.saveTranscript) {
    void saveTranscriptToFile(text);
  }
};

const clearTranscript = () => {
  transcriptText = "";
  if (transcriptTimer) {
    clearInterval(transcriptTimer);
    transcriptTimer = null;
  }
  broadcastTranscript("", true);
};

const saveTranscriptToFile = async (text: string) => {
  const filePath = getTranscriptPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
};

const clearSavedTranscriptFile = async () => {
  const filePath = getTranscriptPath();
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[storage] failed to clear transcript file");
    }
  }
};

const simulateTranscript = (input: string) => {
  if (!listeningState.active) {
    return;
  }
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    clearTranscript();
    return;
  }
  if (transcriptTimer) {
    clearInterval(transcriptTimer);
    transcriptTimer = null;
  }
  let index = 0;
  transcriptText = "";
  transcriptTimer = setInterval(() => {
    transcriptText = words.slice(0, index + 1).join(" ");
    const isFinal = index >= words.length - 1;
    broadcastTranscript(transcriptText, isFinal);
    if (isFinal && transcriptTimer) {
      clearInterval(transcriptTimer);
      transcriptTimer = null;
    }
    index += 1;
  }, 140);
};

const startAudioCapture = () => {
  console.log(`[audio] start capture (${appSettings.audioMode})`);
};

const stopAudioCapture = () => {
  console.log("[audio] stop capture");
};

const updateAudioMode = (mode: AudioCaptureMode) => {
  appSettings = { ...appSettings, audioMode: mode };
  listeningState = { ...listeningState, audioMode: mode };
  if (listeningState.active) {
    stopAudioCapture();
    startAudioCapture();
  }
  broadcastListeningState();
};

const setListening = (active: boolean, source: "hotkey" | "ui") => {
  if (listeningState.active === active) {
    return;
  }

  if (active) {
    overlayVisibilityBeforeListening = overlayWin?.isVisible() ?? false;
    overlayWin?.showInactive();
    startAudioCapture();
  } else {
    stopAudioCapture();
    clearTranscript();
    if (overlayVisibilityBeforeListening === false) {
      overlayWin?.hide();
    }
    overlayVisibilityBeforeListening = null;
  }

  listeningState = {
    active,
    source,
    audioMode: appSettings.audioMode,
  };
  broadcastListeningState();
};

const toggleListening = (source: "hotkey" | "ui") => {
  setListening(!listeningState.active, source);
};

const registerGlobalHotkey = () => {
  if (!appSettings.hotkey) {
    return;
  }

  const success = globalShortcut.register(appSettings.hotkey, () => {
    toggleListening("hotkey");
  });

  if (!success) {
    console.warn(`[hotkey] failed to register: ${appSettings.hotkey}`);
    return;
  }

  if (registeredHotkey && registeredHotkey !== appSettings.hotkey) {
    globalShortcut.unregister(registeredHotkey);
  }
  registeredHotkey = appSettings.hotkey;
};

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on("closed", () => {
    overlayWin?.close();
    overlayWin = null;
    win = null;
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

function createOverlayWindow() {
  const bounds = screen.getPrimaryDisplay().workArea;
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
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWin.setIgnoreMouseEvents(overlayClickThrough, { forward: true });

  if (VITE_DEV_SERVER_URL) {
    const overlayUrl = new URL("overlay.html", VITE_DEV_SERVER_URL);
    overlayWin.loadURL(overlayUrl.toString());
  } else {
    overlayWin.loadFile(path.join(RENDERER_DIST, "overlay.html"));
  }

  overlayWin.on("closed", () => {
    overlayWin = null;
  });

  screen.on("display-metrics-changed", () => {
    if (!overlayWin) {
      return;
    }
    const nextBounds = screen.getPrimaryDisplay().workArea;
    overlayWin.setBounds(nextBounds);
  });
}

function registerIpcHandlers() {
  ipcMain.on(IPC_CHANNELS.overlay.show, () => {
    overlayWin?.showInactive();
  });
  ipcMain.on(IPC_CHANNELS.overlay.hide, () => {
    overlayWin?.hide();
  });
  ipcMain.on(
    IPC_CHANNELS.overlay.updateContent,
    (_event, content: OverlayContent) => {
      overlayWin?.webContents.send(IPC_CHANNELS.overlay.content, content);
    },
  );
  ipcMain.on(
    IPC_CHANNELS.overlay.updateStyle,
    (_event, style: Partial<OverlayStyle>) => {
      appSettings = {
        ...appSettings,
        overlayStyle: { ...appSettings.overlayStyle, ...style },
      };
      overlayWin?.webContents.send(IPC_CHANNELS.overlay.style, style);
    },
  );
  ipcMain.on(
    IPC_CHANNELS.overlay.setClickThrough,
    (_event, enabled: boolean) => {
      overlayClickThrough = enabled;
      overlayWin?.setIgnoreMouseEvents(overlayClickThrough, { forward: true });
    },
  );

  ipcMain.on(IPC_CHANNELS.listening.start, () => setListening(true, "ui"));
  ipcMain.on(IPC_CHANNELS.listening.stop, () => setListening(false, "ui"));
  ipcMain.on(IPC_CHANNELS.listening.toggle, () => toggleListening("ui"));
  ipcMain.handle(IPC_CHANNELS.listening.getState, async () => listeningState);

  ipcMain.handle(IPC_CHANNELS.stt.getConfig, async () => sttConfig);
  ipcMain.handle(
    IPC_CHANNELS.stt.setConfig,
    async (_event, config: SttConfig) => {
      sttConfig = { ...sttConfig, ...config };
    },
  );
  ipcMain.on(IPC_CHANNELS.stt.simulate, (_event, text: string) => {
    simulateTranscript(text);
  });
  ipcMain.on(IPC_CHANNELS.stt.clear, () => {
    clearTranscript();
  });
  ipcMain.on(IPC_CHANNELS.transcript.clearSaved, async () => {
    await clearSavedTranscriptFile();
  });

  ipcMain.handle(IPC_CHANNELS.scaffolds.list, async () => {
    ensureRepositories();
    if (!scaffoldRepository) {
      return [] as Scaffold[];
    }
    return scaffoldRepository.list();
  });
  ipcMain.handle(
    IPC_CHANNELS.scaffolds.upsert,
    async (_event, scaffold: Scaffold) => {
      ensureRepositories();
      if (!scaffoldRepository) {
        return scaffold;
      }
      return scaffoldRepository.upsert(scaffold);
    },
  );
  ipcMain.handle(IPC_CHANNELS.scaffolds.delete, async (_event, id: string) => {
    ensureRepositories();
    if (!scaffoldRepository) {
      return;
    }
    await scaffoldRepository.delete(id);
  });
  ipcMain.handle(
    IPC_CHANNELS.scaffolds.setActive,
    async (_event, id: string) => {
      ensureRepositories();
      if (!scaffoldRepository) {
        return;
      }
      await scaffoldRepository.setActiveId(id);
    },
  );

  ipcMain.handle(IPC_CHANNELS.settings.load, async () => {
    ensureRepositories();
    if (settingsRepository) {
      const settings = await settingsRepository.load();
      appSettings = {
        ...appSettings,
        ...settings,
      };
    }
    const activeScaffoldId = scaffoldRepository
      ? await scaffoldRepository.getActiveId()
      : appSettings.activeScaffoldId;
    appSettings = {
      ...appSettings,
      activeScaffoldId,
    };
    return appSettings;
  });
  ipcMain.handle(
    IPC_CHANNELS.settings.save,
    async (_event, next: AppSettings) => {
      const prevHotkey = appSettings.hotkey;
      const prevAudioMode = appSettings.audioMode;
      const prevSaveTranscript = appSettings.saveTranscript;
      appSettings = { ...appSettings, ...next };

      ensureRepositories();
      if (settingsRepository) {
        await settingsRepository.save({
          overlayStyle: appSettings.overlayStyle,
          audioMode: appSettings.audioMode,
          hotkey: appSettings.hotkey,
          saveTranscript: appSettings.saveTranscript,
        });
      }
      if (scaffoldRepository) {
        await scaffoldRepository.setActiveId(appSettings.activeScaffoldId);
      }

      if (appSettings.hotkey !== prevHotkey) {
        registerGlobalHotkey();
      }
      if (appSettings.audioMode !== prevAudioMode) {
        updateAudioMode(appSettings.audioMode);
      }
      if (appSettings.saveTranscript !== prevSaveTranscript && !appSettings.saveTranscript) {
        await clearSavedTranscriptFile();
      }
    },
  );
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
    overlayWin = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    createOverlayWindow();
  }
});

app.whenReady().then(async () => {
  await hydrateAppSettings();
  registerIpcHandlers();
  createWindow();
  createOverlayWindow();
  registerGlobalHotkey();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
