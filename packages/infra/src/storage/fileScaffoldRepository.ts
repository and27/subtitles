import type { AnswerScaffold } from 'core'
import type { ScaffoldRepositoryPort } from 'core'
import { loadStore, updateStore, type StoreLogger } from './store'

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
    await updateStore(
      this.filePath,
      (data) => {
      const existingIndex = data.scaffolds.findIndex((item) => item.id === scaffold.id)

      if (existingIndex >= 0) {
        data.scaffolds[existingIndex] = scaffold
      } else {
        data.scaffolds.unshift(scaffold)
      }
      },
      this.logger,
    )
    return scaffold
  }

  async delete(id: string): Promise<void> {
    await updateStore(
      this.filePath,
      (data) => {
      data.scaffolds = data.scaffolds.filter((item) => item.id !== id)

      if (data.activeScaffoldId === id) {
        data.activeScaffoldId = null
      }
      },
      this.logger,
    )
  }

  async getActiveId(): Promise<string | null> {
    const data = await loadStore(this.filePath, this.logger)
    return data.activeScaffoldId
  }

  async setActiveId(id: string | null): Promise<void> {
    await updateStore(
      this.filePath,
      (data) => {
        data.activeScaffoldId = id
      },
      this.logger,
    )
  }
}
