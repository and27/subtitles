import { validateAnswerScaffold } from '../../domain/answerScaffold'
import type { AnswerScaffold, AnswerScaffoldInput } from '../../domain/answerScaffold'
import type { ScaffoldRepositoryPort } from '../../ports/scaffoldRepository'
import type { UseCaseResult } from '../result'

export const upsertScaffold = async (
  repository: ScaffoldRepositoryPort,
  input: AnswerScaffoldInput,
): Promise<UseCaseResult<AnswerScaffold>> => {
  const validation = validateAnswerScaffold(input)
  if (!validation.ok) {
    return { ok: false, error: 'invalid_scaffold', issues: validation.issues }
  }

  const saved = await repository.upsert(validation.value)
  return { ok: true, value: saved }
}
