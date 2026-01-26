export type DomainIssue = {
  field: string
  message: string
}

export type DomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: DomainIssue[] }
