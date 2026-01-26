# Subtitles — Issue Tracker (V0 → V1)

Este documento define los issues iniciales del proyecto **Subtitles**.
El objetivo de V0 es tener una app **usable para práctica de entrevistas** con
_presenter hints / answer scaffolding_ y **accesibilidad cognitiva**.
La arquitectura sigue principios **Clean + Hexagonal** desde el día 1.

---

## SUB-001 — Repo bootstrap + workspace

### Objetivo

Inicializar el repositorio como monorepo y establecer una base clara y estable
para el desarrollo del proyecto.

### Alcance

- Crear `pnpm-workspace.yaml`
- Estructura base:
  - `apps/desktop`
  - `packages/core`
  - `packages/infra`
  - `docs`
- README inicial con framing del producto

### Criterios de aceptación (DoD)

- [ ] Existe `pnpm-workspace.yaml` con `apps/*` y `packages/*`
- [ ] Carpetas base creadas y versionadas
- [ ] `pnpm install` en la raíz finaliza sin errores
- [ ] `README.md` describe:
  - Live captions
  - Presenter hints / answer scaffolding
  - Anxiety-friendly mode
  - Cognitive support for live conversations

---

## SUB-002 — Electron dev runs + postinstall fixed

### Objetivo

Asegurar que Electron corre correctamente en modo desarrollo en Windows y que el
binario de Electron se descarga de forma confiable en cada instalación.

### Contexto

En Windows + pnpm workspaces, el `postinstall` de Electron puede no ejecutarse
automáticamente, provocando el error:

> "Electron failed to install correctly"

Este issue fija el problema de forma permanente.

### Alcance

- Validar que el starter de Electron (electron-vite) abre ventana en `dev`
- Garantizar la descarga del binario de Electron en instalaciones futuras

### Tareas

- Agregar script `postinstall` en `apps/desktop/package.json`
- Verificar instalación del binario con `require('electron')`
- Documentar el fix en el repo

### Criterios de aceptación (DoD)

- [ ] `pnpm dev` en `apps/desktop` abre una ventana de Electron sin errores
- [ ] `node -p "require('electron')"` no arroja excepción
- [ ] `apps/desktop/package.json` incluye:
  ```json
  "scripts": {
    "postinstall": "node node_modules/electron/install.js"
  }
  ```
- [ ] Reinstalar dependencias (pnpm install) no rompe Electron

## SUB-003 — IPC contract tipado (single source of truth)

### Objetivo

Definir un contrato IPC único, tipado y seguro entre los procesos `main`,
`preload` y `renderer`, evitando accesos directos a Node desde la UI.

### Contexto

Para mantener Clean + Hexagonal Architecture, el renderer **no debe** usar
`ipcRenderer` ni APIs de Node. Toda comunicación debe pasar por un contrato
centralizado expuesto vía `contextBridge`.

### Alcance

- Definir nombres de canales IPC en un solo lugar
- Definir tipos de payloads y respuestas
- Exponer una API segura al renderer (`window.subtitles`)
- Preparar canales para:
  - Overlay (show/hide/update)
  - Scaffolds (CRUD básico)
  - Settings (load/save)

### Tareas

- Crear módulo de contratos IPC (ej. `ipc/contracts.ts`)
- Implementar handlers en `main` usando el contrato
- Exponer API tipada en `preload`
- Adaptar renderer para consumir solo `window.subtitles`

### Criterios de aceptación (DoD)

- [ ] Existe un archivo único de contrato IPC (types + channel names)
- [ ] Preload expone una API clara y tipada (`window.subtitles`)
- [ ] Renderer no importa `ipcRenderer` ni APIs de Node
- [ ] `contextIsolation: true` habilitado
- [ ] `nodeIntegration: false` en renderer
- [ ] Todos los canales IPC usados están definidos en el contrato

---

## SUB-004 — OverlayWindow (transparent + always-on-top + click-through)

### Objetivo

Implementar una ventana overlay independiente, discreta y no intrusiva,
diseñada para mostrar _presenter hints / answer scaffolding_ sobre cualquier app.

### Contexto

El overlay es el corazón de **Subtitles**: debe ser visible sin interrumpir
la interacción del usuario con otras aplicaciones (Meet, IDEs, navegador).

### Alcance

- Crear una segunda ventana: `OverlayWindow`
- Ventana:
  - Transparente
  - Sin frame
  - Always-on-top
  - Opcionalmente click-through
- Controlada vía IPC desde ControlWindow

### Tareas

- Implementar `createOverlayWindow()` en el main process
- Configurar opciones de `BrowserWindow`:
  - `transparent: true`
  - `frame: false`
  - `alwaysOnTop: true`
- Implementar handlers IPC:
  - `overlay:show`
  - `overlay:hide`
  - `overlay:updateContent`
  - `overlay:updateStyle`
- Cargar contenido mínimo (HTML o React simple)

### Criterios de aceptación (DoD)

- [ ] OverlayWindow se crea correctamente desde el main process
- [ ] Puede mostrarse y ocultarse por IPC
- [ ] Transparencia funcional (se ve el fondo)
- [ ] Always-on-top activo
- [ ] Modo click-through no bloquea clicks en apps detrás
- [ ] No contiene lógica de dominio ni reglas de negocio
- [ ] Overlay puede actualizar texto y estilo en tiempo real

## SUB-005 — ControlWindow UI (Scaffold editor + tokens mínimos + a11y)

### Objetivo

Construir la interfaz principal (ControlWindow) para crear, editar y seleccionar
**Answer Scaffolds**, así como ajustar el estilo del overlay, priorizando
**accesibilidad cognitiva** y usabilidad bajo estrés.

### Contexto

El ControlWindow es donde el usuario prepara y practica.
Debe ser calmado, predecible y accesible, no sobrecargado visualmente.
No es un “dashboard”, es una herramienta de apoyo.

### Alcance

- Editor de Answer Scaffolds
- Selección de scaffold activo
- Controles de estilo del overlay:
  - Opacidad
  - Tamaño de fuente
  - Posición vertical
- Tokens mínimos para consistencia visual
- Accesibilidad base (keyboard-first)

### Tareas

- Implementar vista de lista de scaffolds
- Implementar editor de scaffold:
  - Trigger(s)
  - Structure (bullets)
  - Starter phrases
- Implementar controles de estilo
- Aplicar tokens mínimos:
  - spacing
  - radius
  - typography
- Conectar UI a IPC (sin lógica de dominio en la vista)

### Criterios de aceptación (DoD)

- [ ] Se pueden crear, editar y eliminar scaffolds locales
- [ ] Se puede seleccionar un scaffold activo
- [ ] El overlay refleja el scaffold activo en tiempo real
- [ ] Controles de estilo modifican el overlay inmediatamente
- [ ] Navegación completa por teclado (tab / shift+tab)
- [ ] Focus visible y labels accesibles
- [ ] No hay lógica de negocio en componentes UI

---

## SUB-006 — Core domain (AnswerScaffold + OverlayStyle)

### Objetivo

Definir el **dominio puro** de Subtitles, completamente desacoplado de Electron,
UI y librerías externas, siguiendo principios Clean + Hexagonal.

### Contexto

El dominio modela _qué es_ Subtitles:
estructuras cognitivas, no ventanas ni botones.
Este core debe sobrevivir a cambios de tecnología.

### Alcance

- Entidades principales:
  - `AnswerScaffold`
  - `OverlayStyle`
- Value Objects y validaciones
- Preparación para sesiones y STT (V1)

### Tareas

- Definir `AnswerScaffold`:
  - id
  - triggers
  - structure (ordered bullets)
  - starterPhrases
  - tags (opcional)
- Definir `OverlayStyle`:
  - opacity
  - fontSize
  - lineHeight
  - positionY
- Implementar validaciones y normalización
- Exportar tipos y helpers desde `packages/core`

### Criterios de aceptación (DoD)

- [ ] Código vive en `packages/core`
- [ ] No importa Electron, DOM, React ni IPC
- [ ] Reglas de negocio y límites están en el dominio
- [ ] Tipos testeables de forma aislada
- [ ] Preparado para ser usado por múltiples adaptadores

## SUB-007 — Application layer (Use Cases V0)

### Objetivo

Implementar la capa de aplicación (use cases) para orquestar el dominio
sin acoplarse a Electron/UI, siguiendo Clean + Hexagonal.

### Contexto

El dominio define reglas y estructuras. La capa de aplicación define “acciones”
que el sistema puede ejecutar (comandos), y depende de **puertos** (interfaces)
para persistencia y para comunicar cambios al overlay.

### Alcance

Use cases mínimos para V0:

- `SetActiveScaffold`
- `UpsertScaffold`
- `DeleteScaffold`
- `UpdateOverlayStyle`
- `ToggleOverlay`

Puertos mínimos (interfaces):

- `ScaffoldRepositoryPort` (CRUD + activeId)
- `SettingsRepositoryPort` (overlay style, app settings)
- `OverlayPort` (render/update overlay; show/hide)

### Tareas

- Crear carpeta `packages/core/application` (o `packages/core/usecases`)
- Definir puertos en `packages/core/ports`
- Implementar use cases con validación usando el dominio
- Diseñar resultados de use case (success/error) claros y tipados
- Agregar pruebas unitarias básicas (si aplica en V0)

### Criterios de aceptación (DoD)

- [ ] Use cases no importan Electron, React, DOM ni IPC
- [ ] Las dependencias entran por puertos (interfaces)
- [ ] Los casos de uso validan y normalizan usando el dominio
- [ ] Se pueden ejecutar con mocks (sin infraestructura)
- [ ] UI invoca use cases vía adapters (IPC), no muta dominio directamente

---

## SUB-008 — Persistencia local (JSON + schemaVersion)

### Objetivo

Persistir scaffolds y settings localmente de forma segura, validada y migrable.

### Contexto

El usuario necesita que su configuración sobreviva reinicios.
Además, el formato debe permitir evolución (migraciones V0→V1).

### Alcance

- Persistir:
  - lista de scaffolds
  - scaffold activo (activeScaffoldId)
  - `OverlayStyle`
- Archivo local JSON
- Validación (schema) y fallback seguro
- `schemaVersion` + migración simple

### Tareas

- Implementar adaptador de persistencia en `packages/infra/storage`
  - `FileScaffoldRepository`
  - `FileSettingsRepository`
- Definir `schemaVersion` (ej. `1`)
- Validar load con schema (Zod recomendado)
- Manejar casos:
  - archivo inexistente → defaults
  - archivo corrupto → defaults + log controlado
  - versión anterior → migración (stub para V0)

### Criterios de aceptación (DoD)

- [ ] Al reiniciar la app, scaffolds y estilos se mantienen
- [ ] Validación con schema; datos inválidos no crashean la app
- [ ] Existe `schemaVersion` en el JSON
- [ ] Migración básica preparada (aunque sea no-op en V0)
- [ ] Errores quedan logueados sin interrumpir uso
