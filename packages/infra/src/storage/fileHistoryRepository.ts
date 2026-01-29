import { loadStore, updateStore, type StoreLogger } from './store'

export type HistoryEntry = {
  id: string
  question: string
  response: string
  createdAt: number
}

export class FileHistoryRepository {
  private filePath: string
  private logger?: StoreLogger

  constructor(filePath: string, logger?: StoreLogger) {
    this.filePath = filePath
    this.logger = logger
  }

  async list(): Promise<HistoryEntry[]> {
    const data = await loadStore(this.filePath, this.logger)
    return data.history ?? []
  }

  async add(entry: HistoryEntry): Promise<HistoryEntry[]> {
    const next = await updateStore(
      this.filePath,
      (data) => {
        data.history = [entry, ...(data.history ?? [])]
      },
      this.logger,
    )
    return next.history ?? []
  }

  async clear(): Promise<void> {
    await updateStore(
      this.filePath,
      (data) => {
        data.history = []
      },
      this.logger,
    )
  }
}
