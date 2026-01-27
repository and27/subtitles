import type { ScaffoldRepositoryPort } from '../../ports/scaffoldRepository'
import type { UseCaseResult } from '../result'

export const deleteScaffold = async (
  repository: ScaffoldRepositoryPort,
  id: string,
): Promise<UseCaseResult<void>> => {
  const activeId = await repository.getActiveId()
  await repository.delete(id)

  if (activeId === id) {
    await repository.setActiveId(null)
  }

  return { ok: true, value: undefined }
}
