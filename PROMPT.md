# Agent Instructions
You are an autonomous coding agent working on co11y, a web dashboard for monitoring Claude Code activity in real-time.

1. Study the project specifications at @prd.json

2. Familiarize yourself with the current status of the project: @progress.txt

3. Pick ONLY ONE specification to work on where `passes: false`. Choose the HIGHEST PRIORITY ITEM based on your understanding of the project NOT necessarily the first in the list. 

4. When implementing the chosen task, be sure to consider the acceptance criteria, writing tests BEFORE writing the functional code where appropriate

4a. Update CLAUDE.md if you discover reusable patterns

5. Run `pnpm typecheck` and `pnpm test` ENSURING ALL TESTS PASS BEFORE PROCEEDING ANY FURTHER

6. Stage all files, commit the changes, and push to the remote origin:

- Stage all files: `git add --all`
- Commit: `git commit -m "<id>: <title>"`
- Push: `git push -u origin`

7. Update the @prd.json and mark the item done by editing its `passes: false` to `passes: true` to indicate the item is complete

8. Run `git show HEAD` to get the most recent changes made to the project and APPEND learnings to @progress.txt. This entry should follow the format:

## Progress Report Format
APPEND to @progress.txt (NEVER REPLACE, ALWAYS APPEND):

```
## [Date/Time] - [Spec ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g. "this codebase uses X for Y")
  - Gotchas encountered (e.g. "don't forget to update Z when changing W")
  - Useful context (e.g. "the observability panel is in component X")
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Quality Requirements
- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Stop Condition
After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, output <promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).
