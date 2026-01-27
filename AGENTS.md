# AGENTS.md

## Working agreements (learned)

### Branching & PRs
- One issue per branch and per PR.
- PR description must include `Closes #<issue-number>`.
- If a PR depends on another, call it out in the body **and** link it (e.g. "Depends on #24").

### Writing PR bodies (PowerShell)
- Do not use `\n` inside quoted strings (PowerShell sends them literally).
- Use a here-string for clean formatting:
  ```powershell
  $body = @'
  ## Summary
  - Bullet 1
  - Bullet 2

  Closes #123
  '@
  gh pr create -b $body
  ```
- Alternatively use a file: `gh pr create -F .\pr-body.md`.

### Issue labels
- Only start work when the issue is labeled `status:ready`.
- When work is complete, move label from `status:ready` to `status:review`.
