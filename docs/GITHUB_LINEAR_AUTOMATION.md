# GitHub ↔ Linear status automation

Manual step (Linear UI) — cannot be fully configured via Linear MCP.

## Setup

1. Linear → **Settings → Integrations → GitHub** — connect `Leos0508/planogram` if not already.
2. Team **Planogram** → **Issue statuses & automations** → GitHub section.
3. Suggested mapping for this project:

| GitHub event | Linear status |
|--------------|---------------|
| Start / branch linked (optional) | In Progress |
| PR opened / review requested | In Review |
| PR merged to `main` | Done |
| PR closed without merge | No change (or Canceled if abandoned) |

4. Link PRs with the issue id in branch name or PR body (`PLA-5`, `Fixes PLA-5`).

## Agent / human fallback

If automation is off, update status manually per `.cursor/rules/project-workflow.mdc`.
