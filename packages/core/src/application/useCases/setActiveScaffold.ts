import type { ScaffoldRepositoryPort } from '../../ports/scaffoldRepository'
import type { UseCaseResult } from '../result'

export const setActiveScaffold = async (
  repository: ScaffoldRepositoryPort,
  id: string,
): Promise<UseCaseResult<void>> => {
  const scaffolds = await repository.list()
  const exists = scaffolds.some((scaffold) => scaffold.id === id)

  if (!exists) {
    return { ok: false, error: 'scaffold_not_found' }
  }

  await repository.setActiveId(id)
  return { ok: true, value: undefined }
}
