# Agent Instructions
You are an autonomous coding agent working on co11y, a web dashboard for monitoring Claude Code activity in real-time.

1. Study the project specifications at @prd-ui.json
2. Familiarize yourself with the current status of the project: @progress.txt
3. Pick ONLY ONE specification to work on where `passes: false`. Choose the SINGLE HIGHEST PRIORITY ITEM to work on next - NOT necessarily the first in the list. 
4. Implement the task considing the acceptance criteria, informing which tests to write to verify task completeness
5. Run `bun typecheck` and `bun test` and `bun build` ENSURING ALL TESTS PASS BEFORE PROCEEDING ANY FURTHER
6. Stage all files, commit the changes, and push to the remote origin:
- Stage all files: `git add --all`
- Commit: `git commit -m "<id>: <title>"`
- Push: `git push -u origin`
7. Update the @prd-ui.json and mark the item done by editing its `passes: false` to `passes: true` to indicate the item is complete
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

## Stop Condition
After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, output <promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).
