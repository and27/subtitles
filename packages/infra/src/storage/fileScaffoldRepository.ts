import type { AnswerScaffold } from 'core'
import type { ScaffoldRepositoryPort } from 'core'
import { loadStore, saveStore, type StoreLogger } from './store'

export class FileScaffoldRepository implements ScaffoldRepositoryPort {
  private filePath: string
  private logger?: StoreLogger

  constructor(filePath: string, logger?: StoreLogger) {
    this.filePath = filePath
    this.logger = logger
  }

  async list(): Promise<AnswerScaffold[]> {
    const data = await loadStore(this.filePath, this.logger)
    return data.scaffolds
  }

  async upsert(scaffold: AnswerScaffold): Promise<AnswerScaffold> {
    const data = await loadStore(this.filePath, this.logger)
    const existingIndex = data.scaffolds.findIndex((item) => item.id === scaffold.id)

    if (existingIndex >= 0) {
      data.scaffolds[existingIndex] = scaffold
    } else {
      data.scaffolds.unshift(scaffold)
    }

    await saveStore(this.filePath, data)
    return scaffold
  }

  async delete(id: string): Promise<void> {
    const data = await loadStore(this.filePath, this.logger)
    data.scaffolds = data.scaffolds.filter((item) => item.id !== id)

    if (data.activeScaffoldId === id) {
      data.activeScaffoldId = null
    }

    await saveStore(this.filePath, data)
  }

  async getActiveId(): Promise<string | null> {
    const data = await loadStore(this.filePath, this.logger)
    return data.activeScaffoldId
  }

  async setActiveId(id: string | null): Promise<void> {
    const data = await loadStore(this.filePath, this.logger)
    data.activeScaffoldId = id
    await saveStore(this.filePath, data)
  }
}
