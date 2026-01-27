import type { AnswerScaffold } from '../domain/answerScaffold'

export interface ScaffoldRepositoryPort {
  list: () => Promise<AnswerScaffold[]>
  upsert: (scaffold: AnswerScaffold) => Promise<AnswerScaffold>
  delete: (id: string) => Promise<void>
  getActiveId: () => Promise<string | null>
  setActiveId: (id: string | null) => Promise<void>
}
