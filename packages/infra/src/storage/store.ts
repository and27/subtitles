import fs from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_OVERLAY_STYLE } from 'core'
import { storeSchema, type StoreData } from './schema'

export type StoreLogger = {
  warn: (message: string) => void
}

const createDefaultStore = (): StoreData => ({
  schemaVersion: 1,
  scaffolds: [],
  activeScaffoldId: null,
  overlayStyle: { ...DEFAULT_OVERLAY_STYLE },
})

const storeQueue = new Map<string, Promise<unknown>>()

const enqueueStoreTask = async <T>(
  filePath: string,
  task: () => Promise<T>,
): Promise<T> => {
  const previous = storeQueue.get(filePath) ?? Promise.resolve()
  const next = previous.then(task, task)

  storeQueue.set(
    filePath,
    next.finally(() => {
      if (storeQueue.get(filePath) === next) {
        storeQueue.delete(filePath)
      }
    }),
  )

  return next
}

const migrateStore = (data: unknown, logger?: StoreLogger): StoreData => {
  const version = typeof data === 'object' && data !== null && 'schemaVersion' in data
    ? (data as { schemaVersion?: unknown }).schemaVersion
    : 'unknown'
  logger?.warn(`Unsupported schemaVersion (${String(version)}). Using defaults.`)
  return createDefaultStore()
}

const safeParseStore = (data: unknown, logger?: StoreLogger): StoreData => {
  if (
    typeof data === 'object' &&
    data !== null &&
    'schemaVersion' in data &&
    (data as { schemaVersion?: unknown }).schemaVersion !== 1
  ) {
    return migrateStore(data, logger)
  }

  const parsed = storeSchema.safeParse(data)
  if (!parsed.success) {
    logger?.warn('Invalid storage payload. Using defaults.')
    return createDefaultStore()
  }

  return parsed.data
}

export const loadStore = async (filePath: string, logger?: StoreLogger): Promise<StoreData> => {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(raw)
    return safeParseStore(json, logger)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger?.warn('Failed to read storage file. Using defaults.')
    }
    return createDefaultStore()
  }
}

export const saveStore = async (filePath: string, data: StoreData): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export const updateStore = async (
  filePath: string,
  updater: (data: StoreData) => StoreData | void,
  logger?: StoreLogger,
): Promise<StoreData> => {
  return enqueueStoreTask(filePath, async () => {
    const data = await loadStore(filePath, logger)
    const next = updater(data) ?? data
    await saveStore(filePath, next)
    return next
  })
}
