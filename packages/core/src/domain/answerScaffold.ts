import type { DomainIssue, DomainResult } from './validation'

export type AnswerScaffold = {
  id: string
  triggers: string[]
  structure: string[]
  starterPhrases: string[]
  tags?: string[]
}

export type AnswerScaffoldInput = {
  id?: string
  triggers?: string[]
  structure?: string[]
  starterPhrases?: string[]
  tags?: string[]
}

const normalizeList = (value: string[] | undefined) =>
  (value ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const unique = (items: string[]) => Array.from(new Set(items))

export const normalizeAnswerScaffold = (input: AnswerScaffoldInput): AnswerScaffold => {
  return {
    id: input.id?.trim() ?? '',
    triggers: unique(normalizeList(input.triggers)),
    structure: normalizeList(input.structure),
    starterPhrases: normalizeList(input.starterPhrases),
    tags: input.tags ? unique(normalizeList(input.tags)) : undefined,
  }
}

export const validateAnswerScaffold = (input: AnswerScaffoldInput): DomainResult<AnswerScaffold> => {
  const scaffold = normalizeAnswerScaffold(input)
  const issues: DomainIssue[] = []

  if (!scaffold.id) {
    issues.push({ field: 'id', message: 'id is required' })
  }
  if (scaffold.triggers.length === 0) {
    issues.push({ field: 'triggers', message: 'at least one trigger is required' })
  }
  if (scaffold.structure.length === 0 && scaffold.starterPhrases.length === 0) {
    issues.push({
      field: 'structure',
      message: 'structure or starterPhrases must contain at least one entry',
    })
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, value: scaffold }
}
