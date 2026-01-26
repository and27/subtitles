# Subtitles

**Subtitles** is a desktop application that provides **live captions and presenter hints**
to support people during live conversations, presentations, and interview practice.

It is designed as a tool for **cognitive accessibility**, not as an automation or
“answer generator”.

---

## What problem does Subtitles solve?

Many people — especially those with **social anxiety, trauma, or neurodivergent profiles** —
experience moments of cognitive freeze during live conversations:

- Knowing the answer but going blank
- Losing structure under stress
- Struggling to start a response even when prepared

Subtitles provides **gentle, visual cognitive support** to help users recover fluency
without speaking for them.

---

## Core concept: Answer Scaffolding

Subtitles is built around the idea of **Answer Scaffolding**.

> Answer scaffolding provides structure and anchors — not scripted answers.

Instead of generating responses in real time, Subtitles shows:

- Structural hints (e.g. Context → Action → Result)
- Starter phrases
- Personal reminders prepared in advance

This helps the user **re-access their own knowledge** when under pressure.

---

## Intended use cases

- Practicing interviews with camera on (e.g. Meet / Zoom in the background)
- Live presentations or demos
- Public speaking practice
- Cognitive accessibility support in live conversations
- Language practice with visual cues

---

## What Subtitles is NOT

To be explicit:

- ❌ Not an auto-response tool
- ❌ Not an interview “cheat” or copilot
- ❌ Not a system that speaks or answers on behalf of the user
- ❌ Not undetectable automation

Subtitles never sends answers automatically.
All spoken content comes from the user.

---

## Key features (V0 → V1)

### V0

- Transparent overlay window (always-on-top)
- Presenter hints / answer scaffolds
- Anxiety-friendly visual mode (opacity, blur, position)
- Keyboard-accessible control window
- Local persistence

### V1 (planned)

- Speech-to-text for **intent detection**, not auto-answers
- Automatic scaffold suggestion based on question type
- Session export (transcript, SRT/VTT)
- Post-session coaching and reflection

---

## Accessibility principles

Subtitles is designed with **cognitive accessibility first**:

- Calm, predictable UI
- Low visual noise
- Keyboard-first navigation
- Clear focus states
- No time pressure
- No hidden automation

This is a support tool, not a performance optimizer.

---

## Architecture overview

Subtitles follows **Clean Architecture + Hexagonal Architecture** principles.

## Architecture layers

apps/desktop

- electron/ — main + preload (IPC boundary, OS integrations)
- renderer/ — React UI (ControlWindow + Overlay UI)

packages/core

- domain/ — AnswerScaffold, OverlayStyle, rules (pure, no Electron/UI)
- application/ — use cases (orchestration)
- ports/ — interfaces (repositories, overlay, STT, clock)

packages/infra

- storage/ — JSON/SQLite repositories (adapters for ports)
- ipc/ — IPC adapters / contract implementations
- electron-adapters/ — overlay window, hotkeys, audio capture, etc.

### Key properties

- The domain is completely independent of Electron and UI
- All infrastructure is replaceable
- IPC is strictly typed and centralized
- Renderer never accesses Node APIs directly

This allows future migration (e.g. different desktop shell, mobile, web)
without rewriting the core logic.

---

## Technology stack

- Electron
- Vite + React + TypeScript
- pnpm workspace
- Local-first persistence
- Strict IPC via preload
- No cloud dependency required

---

## Ethics & intent

Subtitles exists to **support people**, not to deceive systems.
Its purpose is to reduce anxiety, restore cognitive access, and help users
communicate as themselves — even under stress.

If a tool speaks for you, it replaces you.  
If a tool supports you, it empowers you.

Subtitles is the latter.

---

## Project status

- Current phase: **V0 (usable practice tool)**
- See `docs/ISSUES.md` for roadmap and implementation details.

---

## License

MIT (or replace if needed)
