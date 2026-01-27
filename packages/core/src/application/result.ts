import type { DomainIssue } from '../domain/validation'

export type UseCaseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; issues?: DomainIssue[] }
