---
name: repo-health
description: Monitor repository health including unpushed commits, stale PRs, security vulnerabilities, outdated dependencies, large files, and branch status. Provides AI-suggested fixes for each issue detected.
metadata: {"openclaw":{"emoji":"🏥","os":["darwin","linux","windows"],"requires":{"bins":["git","npm"]},"install":[{"id":"pip","kind":"pip","package":"requests","bins":["python3"],"label":"Install Python requests library"}]}}
---

# Repo Health Monitor

Monitor repository health and get AI-suggested fixes for common issues.

## Quick Start

```bash
# Check all repos and output to Telegram
python {clawd}/scripts/repo-health-monitor.py --output telegram

# Get JSON output for integration
python {clawd}/scripts/repo-health-monitor.py --output json

# Scan specific repos only (edit repo-list.json)
# Default: scans all repos in DEVPROJECTS folder
```

## What Gets Checked

### 1. **Unpushed Commits** (🟡 Medium)
- Commits older than 2 hours not pushed to remote
- **Fix:** `git push` to sync commits

### 2. **Branch Status** (🟡 Medium / 🟢 Low)
- Branches behind main/master (need merge/rebase)
- Branches ahead of main (need PR or merge)
- **Fix:** `git merge main` or create PR

### 3. **Stale PRs** (🔴 High)
- Open PRs older than 48 hours
- Needs review, merge, or closure
- **Fix:** Review PRs, ping reviewers, or close stale PRs

### 4. **Security Vulnerabilities** (🔴/🟡)
- npm vulnerabilities (high, moderate, low)
- Counts critical and high severity
- **Fix:** `npm audit fix` or update dependencies

### 5. **Outdated Dependencies** (🟢 Low)
- npm packages with updates available
- **Fix:** `npm update` or update specific packages

### 6. **Large Files** (🟡 Medium)
- Files larger than 5MB in git history
- Should be in .gitignore or git-lfs
- **Fix:** Add to .gitignore or use git-lfs

### 7. **Test Failures** (🟢 Low)
- Recent test failures (via CI/CD logs)
- **Fix:** Run tests locally and fix failures

## Configuration

### Repo List
Create `clawd/repo-list.json` to specify which repos to monitor:

```json
[
  {
    "name": "KosTaxi",
    "path": "C:\\Users\\ErnestHome\\DEVPROJECTS\\KosTaxi",
    "type": "git"
  },
  {
    "name": "Ernestclaw",
    "path": "C:\\Users\\ErnestHome\\DEVPROJECTS\\Ernestclaw",
    "type": "git"
  }
]
```

**Default:** Scans all git repos in `DEVPROJECTS` folder automatically.

### Thresholds
Edit these in the script:

```python
STALE_PR_HOURS = 48           # PRs older than this need attention
UNPUSHED_COMMIT_HOURS = 2     # Unpushed commits older than this need sync
LARGE_FILE_THRESHOLD = 5*1024*1024  # 5MB for large files
```

## Output Formats

### Telegram Format (default)
```
🔴 *Repo Health Report*

📁 *KosTaxi*

🔴 *Stale PRs*
💡 *Suggestions:*
  🔀 Review 3 PR(s) older than 48 hours
  💬 Ping reviewers or close if no longer needed

🟡 *Unpushed Commits*
💡 *Suggestions:*
  🚀 Run `git push` to sync 2 commit(s)
  📦 Check branch is correct: `git branch -vv`

_Generated at 2026-02-06 14:30_
```

### JSON Format
```json
{
  "timestamp": "2026-02-06T14:30:00",
  "reports": [
    {
      "repo": "KosTaxi",
      "issues": [
        {
          "type": "stale_prs",
          "severity": "high",
          "count": 3,
          "details": [...]
        }
      ]
    }
  ]
}
```

## Automation

### Via Cron (Recommended)
Add to OpenClaw cron jobs for automated monitoring:

```json
{
  "name": "Repo Health Monitor",
  "schedule": {
    "kind": "cron",
    "expr": "0 */6 * * *"  // Every 6 hours
  },
  "payload": {
    "kind": "systemEvent",
    "text": "Run repo health check: python {clawd}/scripts/repo-health-monitor.py --output telegram"
  },
  "sessionTarget": "main",
  "enabled": true
}
```

### Via Heartbeat
Include in heartbeat checks for periodic monitoring:

```python
# In HEARTBEAT.md
- Run repo health check every 4-6 hours
- Alert only if new issues found
```

## AI-Suggested Fixes

The tool automatically suggests fixes for each issue type:

| Issue Type | Suggested Commands |
|-----------|-------------------|
| Unpushed commits | `git push`, `git branch -vv` |
| Behind main | `git merge main`, `git rebase main` |
| Ahead of main | Create PR, `git checkout main && git merge` |
| Stale PRs | Review, ping reviewers, close |
| Security vulns | `npm audit fix`, update deps |
| Outdated deps | `npm update`, check `npm outdated` |
| Large files | Add to .gitignore, use git-lfs |
| Test failures | `npm test`, check CI logs |

## Common Scenarios

### Scenario 1: Branch Behind Main
```
🟡 *Behind Main*
💡 *Suggestions:*
  🔄 Run `git merge main` or `git rebase main`
  ⬇️ Sync with latest: `git pull origin main`
```

**Action:**
```bash
cd /path/to/repo
git checkout main
git pull
git checkout feature-branch
git merge main
git push
```

### Scenario 2: Security Vulnerabilities
```
🔴 *Security Vulns*
💡 *Suggestions:*
  🔒 Run `npm audit fix` or update dependencies
  📦 Review and patch security vulnerabilities
```

**Action:**
```bash
cd /path/to/repo
npm audit fix
# If issues persist:
npm audit fix --force
```

### Scenario 3: Large Files in History
```
🟡 *Large Files*
💡 *Suggestions:*
  📁 Add to .gitignore or use git-lfs
  🗑️ Remove from history: `git rm --cached <file>`
```

**Action:**
```bash
# 1. Add to .gitignore
echo "large-file.zip" >> .gitignore

# 2. Remove from git tracking
git rm --cached large-file.zip
git add .gitignore
git commit -m "Remove large file from tracking"
git push
```

## Troubleshooting

### "No repos found"
- Check `DEVPROJECTS` path is correct
- Ensure repos have `.git` folder
- Or create `repo-list.json` manually

### "npm not found"
- Install Node.js and npm from nodejs.org
- Or run without npm checks (comment out in script)

### "gh CLI not configured"
- Install: `winget install GitHub.cli`
- Authenticate: `gh auth login`

### Permission denied
- Ensure script has execute permissions
- On Windows: `python` should be in PATH

## Integration with Other Tools

### Pair with Kanban Board
Add repo health issues as tasks:

```bash
# Add stale PRs to kanban
python scripts/repo-health-monitor.py --output json | \
  python scripts/kanban.py add "Review stale PRs" \
    --column backlog \
    --priority high \
    --desc "From repo health check"
```

### Alert via Telegram
Use cron job to send daily summary to Telegram channel.

## Best Practices

1. **Run regularly:** Every 4-6 hours via cron
2. **Fix promptly:** Address high-severity issues first
3. **Keep repos clean:** Don't accumulate unpushed commits
4. **Update deps:** Monthly dependency updates
5. **Review PRs:** Aim for <24 hour PR review time
6. **Secure deps:** Address security vulnerabilities quickly

## References

- **Script location:** `{clawd}/scripts/repo-health-monitor.py`
- **State file:** `{clawd}/scripts/repo-health-state.json`
- **Repo list:** `{clawd}/repo-list.json`
- **OpenClaw docs:** https://docs.openclaw.ai
