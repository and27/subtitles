import { useEffect, useMemo, useState } from "react";
import type {
  AppSettings,
  AudioCaptureMode,
  ListeningState,
  OverlayStyle,
  Scaffold,
  SttConfig,
  SttProvider,
  SttTranscript,
} from "../ipc/contracts";
import "./App.css";

type ScaffoldDraft = {
  id: string;
  triggersText: string;
  structureText: string;
  startersText: string;
  tagsText: string;
};

const DEFAULT_STYLE: OverlayStyle = {
  opacity: 0.9,
  fontSize: 24,
  lineHeight: 1.4,
  positionY: 0.2,
};

const DEFAULT_AUDIO_MODE: AudioCaptureMode = "system";
const DEFAULT_HOTKEY = "CommandOrControl+Shift+Space";
const DEFAULT_STT_PROVIDER: SttProvider = "local";

const seedScaffolds: Scaffold[] = [
  {
    id: "scaffold-intro",
    triggers: ["Tell me about yourself", "Introduce yourself"],
    structure: [
      "Present role + scope",
      "Relevant past experience",
      "Why this role now",
    ],
    starterPhrases: ["Sure—quick overview:", "In my current role..."],
    tags: ["intro"],
  },
  {
    id: "scaffold-challenge",
    triggers: ["Challenge you overcame", "Difficult situation"],
    structure: ["Context", "Action", "Result", "Learning"],
    starterPhrases: ["Here is one example:", "What I learned was..."],
    tags: ["story"],
  },
];

const parseLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toDraft = (scaffold: Scaffold): ScaffoldDraft => ({
  id: scaffold.id,
  triggersText: scaffold.triggers.join("\n"),
  structureText: scaffold.structure.join("\n"),
  startersText: scaffold.starterPhrases.join("\n"),
  tagsText: scaffold.tags?.join(", ") ?? "",
});

const fromDraft = (draft: ScaffoldDraft): Scaffold => ({
  id: draft.id,
  triggers: parseLines(draft.triggersText),
  structure: parseLines(draft.structureText),
  starterPhrases: parseLines(draft.startersText),
  tags: parseTags(draft.tagsText),
});

const scaffoldTitle = (scaffold: Scaffold) =>
  scaffold.triggers[0] ?? scaffold.tags?.[0] ?? "Untitled scaffold";

const buildOverlayText = (scaffold: Scaffold, transcript: string) => {
  const lines: string[] = [];

  if (transcript) {
    lines.push(transcript);
  }

  if (scaffold.structure.length > 0) {
    lines.push(scaffold.structure.map((item) => `• ${item}`).join("\n"));
  }
  if (scaffold.starterPhrases.length > 0) {
    lines.push(scaffold.starterPhrases.join("\n"));
  }

  return (
    lines.join("\n\n") || "Add structure or starter phrases to display here."
  );
};

function App() {
  const [scaffolds, setScaffolds] = useState<Scaffold[]>(seedScaffolds);
  const [activeId, setActiveId] = useState<string>(seedScaffolds[0]?.id ?? "");
  const [draft, setDraft] = useState<ScaffoldDraft>(() =>
    seedScaffolds[0]
      ? toDraft(seedScaffolds[0])
      : toDraft({
          id: "scaffold-new",
          triggers: [],
          structure: [],
          starterPhrases: [],
          tags: [],
        }),
  );
  const [overlayStyle, setOverlayStyle] = useState<OverlayStyle>(DEFAULT_STYLE);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [audioMode, setAudioMode] =
    useState<AudioCaptureMode>(DEFAULT_AUDIO_MODE);
  const [hotkey, setHotkey] = useState(DEFAULT_HOTKEY);
  const [hotkeyDraft, setHotkeyDraft] = useState(DEFAULT_HOTKEY);
  const [sttProvider, setSttProvider] =
    useState<SttProvider>(DEFAULT_STT_PROVIDER);
  const [sttApiKey, setSttApiKey] = useState("");
  const [sttConfigLoaded, setSttConfigLoaded] = useState(false);
  const [listeningState, setListeningState] = useState<ListeningState>({
    active: false,
    audioMode: DEFAULT_AUDIO_MODE,
  });
  const [transcript, setTranscript] = useState<SttTranscript>({
    text: "",
    isFinal: true,
    updatedAt: 0,
  });
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [scaffoldsLoaded, setScaffoldsLoaded] = useState(false);
  const [storedActiveId, setStoredActiveId] = useState<string | null>(null);

  const activeDraft = useMemo(() => fromDraft(draft), [draft]);

  useEffect(() => {
    const active = scaffolds.find((item) => item.id === activeId);
    if (active) {
      setDraft(toDraft(active));
    }
  }, [activeId, scaffolds]);

  useEffect(() => {
    window.subtitles.scaffolds.list().then((items) => {
      if (items.length > 0) {
        setScaffolds(items);
        const preferredId =
          storedActiveId && items.some((item) => item.id === storedActiveId)
            ? storedActiveId
            : items[0]?.id ?? "";
        setActiveId(preferredId);
      }
      setScaffoldsLoaded(true);
    });
    window.subtitles.settings.load().then((settings) => {
      setOverlayStyle(settings.overlayStyle);
      if (settings.activeScaffoldId) {
        setStoredActiveId(settings.activeScaffoldId);
        if (
          scaffoldsLoaded &&
          scaffolds.some((item) => item.id === settings.activeScaffoldId)
        ) {
          setActiveId(settings.activeScaffoldId);
        }
      }
      setAudioMode(settings.audioMode ?? DEFAULT_AUDIO_MODE);
      setHotkey(settings.hotkey ?? DEFAULT_HOTKEY);
      setHotkeyDraft(settings.hotkey ?? DEFAULT_HOTKEY);
      setSettingsLoaded(true);
    });
    window.subtitles.stt.getConfig().then((config) => {
      setSttProvider(config.provider ?? DEFAULT_STT_PROVIDER);
      setSttApiKey(config.cloudApiKey ?? "");
      setSttConfigLoaded(true);
    });
    const unsubscribeListening = window.subtitles.onListeningState((state) => {
      setListeningState(state);
    });
    const unsubscribeTranscript = window.subtitles.onSttTranscript(
      (payload) => {
        setTranscript(payload);
      },
    );
    window.subtitles.listening.getState().then((state) => {
      setListeningState(state);
    });
    return () => {
      unsubscribeListening();
      unsubscribeTranscript();
    };
  }, []);

  useEffect(() => {
    window.subtitles.overlay.updateStyle(overlayStyle);
  }, [overlayStyle]);

  useEffect(() => {
    if (!settingsLoaded || !scaffoldsLoaded) {
      return;
    }
    if (storedActiveId && activeId !== storedActiveId) {
      return;
    }
    persistSettings();
  }, [overlayStyle, settingsLoaded, scaffoldsLoaded, activeId, storedActiveId]);

  useEffect(() => {
    if (!settingsLoaded) {
      return
    }
    persistSettings()
  }, [overlayStyle])

  useEffect(() => {
    if (!activeId) {
      return;
    }
    const content = buildOverlayText(activeDraft, transcript.text);
    window.subtitles.overlay.updateContent({ text: content });
    const shouldShowOverlay = overlayVisible || listeningState.active;
    if (shouldShowOverlay) {
      window.subtitles.overlay.show();
    } else {
      window.subtitles.overlay.hide();
    }
  }, [
    activeDraft,
    activeId,
    overlayVisible,
    listeningState.active,
    transcript.text,
  ]);

  const handleCreate = () => {
    const id = crypto.randomUUID?.() ?? `scaffold-${Date.now()}`;
    const next = {
      id,
      triggers: [],
      structure: [],
      starterPhrases: [],
      tags: [],
    };
    setScaffolds((prev) => [next, ...prev]);
    setActiveId(id);
    setDraft(toDraft(next));
    window.subtitles.scaffolds.upsert(next);
    window.subtitles.scaffolds.setActive(id);
  };

  const handleSave = () => {
    const scaffold = activeDraft;
    setScaffolds((prev) => {
      const exists = prev.some((item) => item.id === scaffold.id);
      if (!exists) {
        return [scaffold, ...prev];
      }
      return prev.map((item) => (item.id === scaffold.id ? scaffold : item));
    });
    setActiveId(scaffold.id);
    window.subtitles.scaffolds.upsert(scaffold);
  };

  const handleDelete = () => {
    if (!activeId) {
      return;
    }
    const remaining = scaffolds.filter((item) => item.id !== activeId);
    setScaffolds(remaining);
    window.subtitles.scaffolds.delete(activeId);
    const next = remaining[0];
    if (next) {
      setActiveId(next.id);
      setDraft(toDraft(next));
    } else {
      setActiveId("");
      window.subtitles.overlay.updateContent({ text: "" });
      window.subtitles.overlay.hide();
    }
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    window.subtitles.scaffolds.setActive(id);
  };

  const handleStyleChange = (patch: Partial<OverlayStyle>) => {
    setOverlayStyle((prev) => ({ ...prev, ...patch }));
  };

  const persistSettings = (overrides: Partial<AppSettings> = {}) => {
    if (!settingsLoaded) {
      return;
    }
    window.subtitles.settings.save({
      overlayStyle,
      activeScaffoldId: activeId || null,
      hotkey,
      audioMode,
      ...overrides,
    });
  };

  const handleAudioModeChange = (mode: AudioCaptureMode) => {
    setAudioMode(mode);
    persistSettings({ audioMode: mode });
  };

  const handleApplyHotkey = () => {
    const next = hotkeyDraft.trim();
    if (!next) {
      return;
    }
    setHotkey(next);
    persistSettings({ hotkey: next });
  };

  const persistSttConfig = (overrides: Partial<SttConfig> = {}) => {
    if (!sttConfigLoaded) {
      return;
    }
    window.subtitles.stt.setConfig({
      provider: sttProvider,
      cloudApiKey: sttApiKey || undefined,
      ...overrides,
    });
  };

  const handleSttProviderChange = (provider: SttProvider) => {
    setSttProvider(provider);
    persistSttConfig({ provider });
  };

  const handleApplySttApiKey = () => {
    persistSttConfig({ cloudApiKey: sttApiKey || undefined });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Control Window</p>
          <h1>Subtitles Studio</h1>
          <p className="subtitle">
            Calm scaffolds for live conversations. Keep it clear, short, and
            accessible.
          </p>
        </div>
        <div className="header-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={overlayVisible}
              onChange={(event) => setOverlayVisible(event.target.checked)}
            />
            <span>Overlay visible</span>
          </label>
          <div
            className={`status-badge ${listeningState.active ? "is-on" : "is-off"}`}
          >
            <span className="status-dot" />
            <span>{listeningState.active ? "Listening" : "Idle"}</span>
          </div>
          <button className="primary" type="button" onClick={handleCreate}>
            New scaffold
          </button>
        </div>
      </header>

      <main className="app-grid">
        <section className="panel live-panel" aria-label="Live assist controls">
          <div className="panel-header">
            <h2>Live assist</h2>
            <p>Hotkey starts listening and shows the overlay.</p>
          </div>
          <div className="listening-row">
            <div
              className={`status-badge ${listeningState.active ? "is-on" : "is-off"}`}
            >
              <span className="status-dot" />
              <span>{listeningState.active ? "Listening" : "Idle"}</span>
            </div>
            <button
              className={listeningState.active ? "ghost" : "primary"}
              type="button"
              onClick={() => window.subtitles.listening.toggle()}
            >
              {listeningState.active ? "Stop listening" : "Start listening"}
            </button>
          </div>
          <label className="field">
            Audio source
            <select
              value={audioMode}
              onChange={(event) =>
                handleAudioModeChange(event.target.value as AudioCaptureMode)
              }
            >
              <option value="system">System audio (Meet/Zoom/browser)</option>
              <option value="mic">Microphone only</option>
              <option value="mixed">Mixed (system + mic)</option>
            </select>
            <span className="field-hint">
              Windows only for now. Toggle anytime.
            </span>
          </label>
          <label className="field">
            STT provider
            <select
              value={sttProvider}
              onChange={(event) =>
                handleSttProviderChange(event.target.value as SttProvider)
              }
            >
              <option value="local">Local (offline)</option>
              <option value="cloud">Cloud (API key)</option>
            </select>
            <span className="field-hint">
              Switches at runtime. Cloud requires an API key.
            </span>
          </label>
          <label className="field">
            Cloud API key
            <div className="hotkey-row">
              <input
                type="password"
                value={sttApiKey}
                onChange={(event) => setSttApiKey(event.target.value)}
                placeholder="sk-..."
              />
              <button
                className="ghost"
                type="button"
                onClick={handleApplySttApiKey}
              >
                Save
              </button>
            </div>
            <span className="field-hint">Stored in memory for now.</span>
          </label>
          <label className="field">
            Transcript (simulate)
            <textarea
              rows={3}
              value={transcriptDraft}
              onChange={(event) => setTranscriptDraft(event.target.value)}
              placeholder="Paste text to simulate live captions"
            />
            <div className="field-actions">
              <button
                className="ghost"
                type="button"
                onClick={() => window.subtitles.stt.simulate(transcriptDraft)}
                disabled={
                  !listeningState.active || transcriptDraft.trim().length === 0
                }
              >
                Send
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => window.subtitles.stt.clear()}
              >
                Clear
              </button>
            </div>
          </label>
          <label className="field">
            Hotkey
            <div className="hotkey-row">
              <input
                type="text"
                value={hotkeyDraft}
                onChange={(event) => setHotkeyDraft(event.target.value)}
                placeholder={DEFAULT_HOTKEY}
              />
              <button
                className="ghost"
                type="button"
                onClick={handleApplyHotkey}
              >
                Apply
              </button>
            </div>
            <span className="field-hint">
              Example: Ctrl+Shift+Space or CommandOrControl+Shift+Space.
            </span>
          </label>
        </section>

        <section className="panel list-panel" aria-label="Scaffold list">
          <div className="panel-header">
            <h2>Scaffolds</h2>
            <p>Pick one to edit or create a new pattern.</p>
          </div>
          <div
            className="scaffold-list"
            role="listbox"
            aria-label="Available scaffolds"
          >
            {scaffolds.map((scaffold) => (
              <button
                key={scaffold.id}
                type="button"
                className={`scaffold-item ${scaffold.id === activeId ? "is-active" : ""}`}
                onClick={() => handleSelect(scaffold.id)}
              >
                <span className="scaffold-title">
                  {scaffoldTitle(scaffold)}
                </span>
                <span className="scaffold-meta">
                  {scaffold.triggers.length} triggers ·{" "}
                  {scaffold.structure.length} bullets
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel editor-panel">
          <div className="panel-header">
            <h2>Scaffold editor</h2>
            <p>Edit the active scaffold. One item per line.</p>
          </div>

          <form
            className="editor-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <label>
              Trigger(s)
              <textarea
                rows={3}
                value={draft.triggersText}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    triggersText: event.target.value,
                  }))
                }
                placeholder="Tell me about yourself"
              />
            </label>

            <label>
              Structure (bullets)
              <textarea
                rows={4}
                value={draft.structureText}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    structureText: event.target.value,
                  }))
                }
                placeholder="Context\nAction\nResult"
              />
            </label>

            <label>
              Starter phrases
              <textarea
                rows={3}
                value={draft.startersText}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    startersText: event.target.value,
                  }))
                }
                placeholder="Sure—quick overview:"
              />
            </label>

            <label>
              Tags (comma separated)
              <input
                type="text"
                value={draft.tagsText}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    tagsText: event.target.value,
                  }))
                }
                placeholder="intro, behavioral"
              />
            </label>

            <div className="editor-actions">
              <button
                className="ghost"
                type="button"
                onClick={handleDelete}
                disabled={!activeId}
              >
                Delete
              </button>
              <button className="primary" type="button" onClick={handleSave}>
                Save changes
              </button>
            </div>
          </form>
        </section>

        <section className="panel style-panel">
          <div className="panel-header">
            <h2>Overlay style</h2>
            <p>Adjust for calm readability. Updates the overlay instantly.</p>
          </div>

          <div className="style-control">
            <label htmlFor="opacity">Opacity</label>
            <input
              id="opacity"
              type="range"
              min={20}
              max={100}
              value={Math.round(overlayStyle.opacity * 100)}
              onChange={(event) =>
                handleStyleChange({ opacity: Number(event.target.value) / 100 })
              }
            />
            <span>{Math.round(overlayStyle.opacity * 100)}%</span>
          </div>

          <div className="style-control">
            <label htmlFor="fontSize">Font size</label>
            <input
              id="fontSize"
              type="range"
              min={16}
              max={48}
              value={overlayStyle.fontSize}
              onChange={(event) =>
                handleStyleChange({ fontSize: Number(event.target.value) })
              }
            />
            <span>{overlayStyle.fontSize}px</span>
          </div>

          <div className="style-control">
            <label htmlFor="lineHeight">Line height</label>
            <input
              id="lineHeight"
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={overlayStyle.lineHeight}
              onChange={(event) =>
                handleStyleChange({ lineHeight: Number(event.target.value) })
              }
            />
            <span>{overlayStyle.lineHeight.toFixed(2)}</span>
          </div>

          <div className="style-control">
            <label htmlFor="positionY">Vertical position</label>
            <input
              id="positionY"
              type="range"
              min={0}
              max={100}
              value={Math.round(overlayStyle.positionY * 100)}
              onChange={(event) =>
                handleStyleChange({
                  positionY: Number(event.target.value) / 100,
                })
              }
            />
            <span>{Math.round(overlayStyle.positionY * 100)}%</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
