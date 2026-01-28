import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppSettings,
  AudioCaptureMode,
  ListeningState,
  OverlayStyle,
  Scaffold,
  SttConfig,
  SttMetrics,
  SttProvider,
  SttRuntimeStatus,
  SttTranscript,
  LlmProvider,
  LlmResponse,
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
const DEFAULT_LLM_PROVIDER: LlmProvider = "local";
const DEFAULT_LATENCY_TARGET_MS = 1200;

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

const OVERLAY_PAGE_LINES = 7;

const paginateLines = (text: string, maxLines: number): string[] => {
  const lines = text.split(/\r?\n/);
  const hasContent = lines.some((line) => line.trim().length > 0);
  if (!hasContent) {
    return [""];
  }
  if (lines.length <= maxLines) {
    return [lines.join("\n")];
  }
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    pages.push(lines.slice(i, i + maxLines).join("\n"));
  }
  return pages;
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
  const [sttConfigLoaded, setSttConfigLoaded] = useState(false);
  const [llmProvider, setLlmProvider] =
    useState<LlmProvider>(DEFAULT_LLM_PROVIDER);
  const [llmMode, setLlmMode] = useState<"coaching" | "direct">("coaching");
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
  const [llmOutput, setLlmOutput] = useState<LlmResponse | null>(null);
  const lastLlmQuestionRef = useRef("");
  const [sttMetrics, setSttMetrics] = useState<SttMetrics>({
    totalUpdates: 0,
    lateUpdates: 0,
    lastUpdateAt: null,
    lastUpdateIntervalMs: null,
    avgUpdateIntervalMs: null,
    dropRate: 0,
  });
  const [sttStatus, setSttStatus] = useState<SttRuntimeStatus>({
    backoffUntil: null,
    failureCount: 0,
  });
  const [saveTranscript, setSaveTranscript] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [scaffoldsLoaded, setScaffoldsLoaded] = useState(false);
  const [storedActiveId, setStoredActiveId] = useState<string | null>(null);

  const activeDraft = useMemo(() => fromDraft(draft), [draft]);
  const llmText = llmOutput?.text ?? "";
  const overlayPages = useMemo(
    () => paginateLines(llmText, OVERLAY_PAGE_LINES),
    [llmText],
  );
  const [overlayPageIndex, setOverlayPageIndex] = useState(0);

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
            : (items[0]?.id ?? "");
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
      setSaveTranscript(settings.saveTranscript ?? false);
      setLlmMode(settings.llmMode ?? "coaching");
      setSettingsLoaded(true);
    });
    window.subtitles.stt.getConfig().then((config) => {
      setSttProvider(config.provider ?? DEFAULT_STT_PROVIDER);
      setSttConfigLoaded(true);
    });
    window.subtitles.llm.getConfig().then((config) => {
      setLlmProvider(config.provider ?? DEFAULT_LLM_PROVIDER);
    });
    window.subtitles.stt.getMetrics().then((metrics) => {
      setSttMetrics(metrics);
    });
    window.subtitles.stt.getStatus().then((status) => {
      setSttStatus(status);
    });
    const unsubscribeListening = window.subtitles.onListeningState((state) => {
      setListeningState(state);
    });
    const unsubscribeTranscript = window.subtitles.onSttTranscript(
      (payload) => {
        setTranscript(payload);
      },
    );
    const unsubscribeMetrics = window.subtitles.onSttMetrics((metrics) => {
      setSttMetrics(metrics);
    });
    const unsubscribeStatus = window.subtitles.onSttStatus((status) => {
      setSttStatus(status);
    });
    window.subtitles.listening.getState().then((state) => {
      setListeningState(state);
    });
    return () => {
      unsubscribeListening();
      unsubscribeTranscript();
      unsubscribeMetrics();
      unsubscribeStatus();
    };
  }, []);

  useEffect(() => {
    window.subtitles.overlay.updateStyle(overlayStyle);
  }, [overlayStyle]);

  useEffect(() => {
    setOverlayPageIndex(0);
    if (overlayPages.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setOverlayPageIndex((prev) => (prev + 1) % overlayPages.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [overlayPages.length, llmText]);

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
      return;
    }
    persistSettings();
  }, [overlayStyle]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    if (!overlayVisible) {
      window.subtitles.overlay.updateContent({ text: "" });
      window.subtitles.overlay.hide();
      return;
    }
    const hasLlmOutput = llmText.trim().length > 0;
    const content = hasLlmOutput
      ? (overlayPages[overlayPageIndex] ?? llmText)
      : listeningState.active
        ? "Listening..."
        : "Ready to create";
    window.subtitles.overlay.updateContent({ text: content });
    window.subtitles.overlay.show();
  }, [
    activeId,
    overlayVisible,
    listeningState.active,
    llmText,
    overlayPages,
    overlayPageIndex,
  ]);

  useEffect(() => {
    const question = transcript.text.trim();
    if (!question || !transcript.isFinal) {
      return;
    }
    if (lastLlmQuestionRef.current === question) {
      return;
    }
    lastLlmQuestionRef.current = question;
    void requestLlmHints(question);
  }, [transcript.text, transcript.isFinal]);

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
      saveTranscript,
      llmMode,
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

  const handleSaveTranscriptToggle = (enabled: boolean) => {
    setSaveTranscript(enabled);
    persistSettings({ saveTranscript: enabled });
  };

  const backoffRemainingMs = sttStatus.backoffUntil
    ? Math.max(0, sttStatus.backoffUntil - Date.now())
    : 0;

  const persistSttConfig = (overrides: Partial<SttConfig> = {}) => {
    if (!sttConfigLoaded) {
      return;
    }
    window.subtitles.stt.setConfig({
      provider: sttProvider,
      ...overrides,
    });
  };

  const requestLlmHints = async (question: string) => {
    try {
      const response = await window.subtitles.llm.generate({
        question,
        mode: llmMode,
      });
      setLlmOutput(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate hints.";
      setLlmOutput({
        text: `Unable to generate hints.\n${message}`,
        updatedAt: Date.now(),
        provider: llmProvider,
      });
    }
  };

  const handleSttProviderChange = (provider: SttProvider) => {
    setSttProvider(provider);
    persistSttConfig({ provider });
  };

  const handleLlmModeChange = (mode: "coaching" | "direct") => {
    setLlmMode(mode);
    persistSettings({ llmMode: mode });
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
          <div className="field metrics-card" aria-live="polite">
            <div className="metrics-row">
              <span>Last interval</span>
              <strong>
                {sttMetrics.lastUpdateIntervalMs
                  ? `${sttMetrics.lastUpdateIntervalMs} ms`
                  : "—"}
              </strong>
            </div>
            <div className="metrics-row">
              <span>Avg interval</span>
              <strong>
                {sttMetrics.avgUpdateIntervalMs
                  ? `${sttMetrics.avgUpdateIntervalMs} ms`
                  : "—"}
              </strong>
            </div>
            <div className="metrics-row">
              <span>Late updates</span>
              <strong>
                {sttMetrics.lateUpdates}/{sttMetrics.totalUpdates}
              </strong>
            </div>
            <div className="metrics-row">
              <span>Drop rate</span>
              <strong>{Math.round(sttMetrics.dropRate * 100)}%</strong>
            </div>
            <div className="metrics-row">
              <span>Backoff</span>
              <strong>
                {backoffRemainingMs > 0
                  ? `${Math.ceil(backoffRemainingMs / 100) / 10}s`
                  : "—"}
              </strong>
            </div>
            {sttStatus.lastError ? (
              <p className="field-hint">Last error: {sttStatus.lastError}</p>
            ) : null}
          </div>
          <div className="field">
            <div className="metrics-row">
              <span>LLM provider</span>
              <strong>{llmProvider === "openai" ? "OpenAI" : "Local"}</strong>
            </div>
            <span className="field-hint">Set via LLM_PROVIDER</span>
          </div>
          <label className="field">
            Output mode
            <select
              value={llmMode}
              onChange={(event) =>
                handleLlmModeChange(event.target.value as "coaching" | "direct")
              }
            >
              <option value="coaching">Coaching hints</option>
              <option value="direct">Direct answer</option>
            </select>
          </label>
          <label className="field">
            Practice mode (manual)
            <textarea
              rows={3}
              value={transcriptDraft}
              onChange={(event) => setTranscriptDraft(event.target.value)}
              placeholder="Type or paste a question to practice"
            />
            <div className="field-actions">
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  const question = transcriptDraft.trim();
                  if (!question) {
                    return;
                  }
                  lastLlmQuestionRef.current = question;
                  void requestLlmHints(question);
                }}
                disabled={transcriptDraft.trim().length === 0}
              >
                Practice
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => window.subtitles.stt.simulate(transcriptDraft)}
                disabled={
                  !listeningState.active || transcriptDraft.trim().length === 0
                }
              >
                Simulate live
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  window.subtitles.stt.clear();
                  setLlmOutput(null);
                  lastLlmQuestionRef.current = "";
                }}
              >
                Clear
              </button>
            </div>
            <span className="field-hint">
              Works without listening. Simulate requires listening.
            </span>
          </label>
          <label className="field">
            Save transcript (opt-in)
            <div className="toggle">
              <input
                type="checkbox"
                checked={saveTranscript}
                onChange={(event) =>
                  handleSaveTranscriptToggle(event.target.checked)
                }
              />
              <span>Store transcript as TXT (audio is never saved)</span>
            </div>
            <div className="field-actions">
              <button
                className="ghost"
                type="button"
                onClick={() => window.subtitles.transcript.clearSaved()}
              >
                Delete saved transcript
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
