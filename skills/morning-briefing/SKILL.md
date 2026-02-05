---
name: morning-briefing
description: Generate comprehensive daily morning briefings including weather, GitHub activity, kanban tasks, calendar events, and AI-powered recommendations. Supports multiple output formats (markdown, Telegram, plain text) and automated scheduling.
metadata: {"openclaw":{"emoji":"🌅","os":["darwin","linux","windows"],"requires":{"bins":["python3"],"optional":["git","gh"]},"install":[{"id":"pip","kind":"pip","package":"requests","bins":["python3"],"label":"Install Python requests library"}]}}
---

# Morning Briefing

Generate comprehensive daily briefings for Ernest with weather, tasks, and personalized recommendations.

## Quick Start

```bash
# Generate briefing in markdown format (default)
python {clawd}/scripts/morning-briefing.py markdown

# Generate for Telegram (formatted)
python {clawd}/scripts/morning-briefing.py telegram

# Generate plain text
python {clawd}/scripts/morning-briefing.py text
```

## What's Included

### 🌤️ Weather
- Current conditions and temperature
- Feels like, high/low temps
- Humidity and wind speed
- Location and provider info

**APIs supported:**
1. OpenWeatherMap (primary)
2. WeatherAPI (fallback)
3. Mock data (last resort)

### 📊 Task Overview
From Kanban board (`kanban-data.json`):

- **In Progress** - Tasks currently being worked on
- **Ready for Review** - Tasks awaiting review
- **Backlog Highlights** - Top 5 backlog items
- **High Priority** - All high-priority tasks across all columns

### 💡 Recommendations
AI-generated suggestions based on:
- Task priorities and deadlines
- Work patterns and time of day
- Business vs personal hours
- Weekend vs weekday context

### 📝 Quick Stats
- Total tasks
- Tasks in progress
- Tasks ready for review
- Backlog count
- Completed tasks

## Configuration

### Environment Variables

```bash
# Weather API keys (optional, script falls back gracefully)
OPENWEATHER_API_KEY="your_key_here"
WEATHERAPI_KEY="your_key_here"

# Weather location (default: Kos,GR)
WEATHER_LOCATION="Kos,GR"
```

### Workspace Settings

- **Workspace path:** `C:\Users\ErnestHome\clawd`
- **Kanban data:** `kanban-data.json`
- **Memory dir:** `memory/`
- **Briefing output:** `second-brain/briefings/`

## Output Formats

### Markdown (default)
```markdown
# 🌅 Morning Briefing

**Date:** Friday, February 6, 2026
**Generated:** 09:00 GMT+2

## 🌤️ Weather

☀ **Kos** - Sunny

- Temperature: 22°C
- Feels like: 20°C
- Range: 18°C - 25°C
- Humidity: 45%
- Wind: 12 km/h

## 📊 Task Overview

### 🚀 In Progress (2 tasks)
- 🔴 **Chat History V1** (clawdbot)
  - Implement core chat history features

### 🔍 Ready for Review (1 task)
- **GitHub CLI Installation** - Ready for review

...
```

**File location:** `second-brain/briefings/briefing-YYYY-MM-DD.md`

### Telegram Format
```
🌅 *Morning Briefing*

📅 Friday, February 6, 2026

☀ *Kos* - Sunny
22°C | Sunny

*🚀 In Progress (2)*
🔴 Chat History V1
🟡 File Explorer Feature

*🔍 Ready for Review (1)*
1 task needs review

*🔥 High Priority (3)*
• Chat History V1
• File Explorer Feature
• Morning Briefing V2

💡 *Focus on high-priority tasks first!*

📊 Total: 25 tasks | Progress: 2 | Done: 15
```

Perfect for Telegram bots and messaging channels.

### Plain Text Format
```
MORNING BRIEFING
========================================
Date: Friday, February 6, 2026
========================================

☀ Kos - Sunny
22°C | Sunny

========================================
IN PROGRESS (2)
  [HIGH] Chat History V1
         Implement core chat history features

========================================
READY FOR REVIEW (1)
  - GitHub CLI Installation

========================================
Total: 25 | In Progress: 2 | Done: 15
========================================
```

Clean, console-friendly output.

## Automation

### Via Cron Job

Add to OpenClaw cron for automated daily briefings:

```json
{
  "name": "Daily Morning Briefing",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *",
    "tz": "Europe/Athens"
  },
  "payload": {
    "kind": "systemEvent",
    "text": "Generate morning briefing and send to Telegram: python {clawd}/scripts/morning-briefing.py telegram"
  },
  "sessionTarget": "main",
  "enabled": true
}
```

**Note:** Also configure message tool to send output to Telegram user 909460560.

### Via Windows Task Scheduler

For Windows-specific automation:

```powershell
# Create scheduled task
schtasks /create /tn "MorningBriefing" /tr "python C:\Users\ErnestHome\clawd\scripts\morning-briefing.py telegram" /sc daily /st 09:00
```

## Integration Examples

### Send to Telegram

```bash
# Generate and send briefing
python scripts/morning-briefing.py telegram > /tmp/briefing.txt
# Then use message tool to send contents
```

### Add to Kanban Board

```bash
# Add briefing task if none in progress
python scripts/kanban.py add "Review morning briefing" \
  --column backlog \
  --priority low \
  --desc "Check daily morning briefing and action items"
```

### Track Briefing History

Briefings are automatically saved to `second-brain/briefings/`:
- `briefing-2026-02-06.md`
- `briefing-2026-02-07.md`
- ...

Review weekly to identify patterns in productivity.

## AI-Powered Recommendations

The briefing generates context-aware suggestions:

### Business Hours (Weekdays 9-17)
```
💡 *Business hours! Consider prioritizing Kos Taxi (revenue-critical) tasks.*
```

### Weekend Morning
```
🌞 *It's weekend morning! Consider taking it easy unless urgent.*
```

### Late Night (23+)
```
🌙 *Late night! Anything urgent, or can it wait until tomorrow?*
```

### High Task Load
```
📋 *Focus on high-priority items first - Complete the 🔴 tasks*
```

## Troubleshooting

### Weather Unavailable
```
⚠ Weather unavailable (no API keys configured)
```

**Fix:** Add API keys:
```bash
# OpenWeatherMap
export OPENWEATHER_API_KEY="your_key"

# WeatherAPI
export WEATHERAPI_KEY="your_key"
```

Or accept mock data (script still works).

### Kanban Data Not Found
```
Error loading kanban data: No such file
```

**Fix:** Ensure `kanban-data.json` exists in workspace:
```bash
python scripts/kanban.py list > kanban-data.json
```

### UTF-8 Encoding Issues (Windows)
```
UnicodeEncodeError: 'charmap' codec can't encode character
```

**Fix:** Script handles this automatically. If you see it, update Python or run in PowerShell with UTF-8:
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

## Customization

### Modify Weather Location

Edit script or use environment variable:
```bash
export WEATHER_LOCATION="Athens,GR"
python scripts/morning-briefing.py markdown
```

### Change Date Format

Edit `format_briefing_markdown()` in script:
```python
date_str = datetime.now().strftime('%A, %B %d, %Y')
```

### Add Custom Sections

Extend the script with new functions:
```python
def add_calendar_events():
    # Fetch from calendar API
    pass

def add_social_mentions():
    # Fetch X.com mentions
    pass
```

## Best Practices

1. **Schedule at consistent time** (e.g., 9 AM daily)
2. **Review briefings weekly** to identify patterns
3. **Act on recommendations** - they're generated for a reason
4. **Keep Kanban updated** - briefing relies on task data
5. **Archive old briefings** - monthly cleanup of `briefings/` folder

## Advanced Usage

### Briefing with Custom Date

```bash
# For testing or retrospective
python scripts/morning-briefing.py markdown  # Uses current date
```

### Filter Tasks by Project

Modify `load_kanban_tasks()` to filter:
```python
def load_kanban_tasks():
    # Add project filter
    return [t for t in all_tasks if t.get('project') == 'clawdbot']
```

### Integrate with Calendar

Add calendar section:
```python
def get_calendar_events():
    # Use calendar API to fetch today's events
    events = fetch_calendar_events(date)
    return format_calendar(events)
```

## References

- **Main script:** `{clawd}/scripts/morning-briefing.py`
- **Weather module:** `{clawd}/scripts/weather.py`
- **Kanban data:** `{clawd}/kanban-data.json`
- **Briefing output:** `{clawd}/second-brain/briefings/`
- **OpenClaw docs:** https://docs.openclaw.ai

## Related Skills

- `kanban` - Task management
- `github` - GitHub activity tracking
- `repo-health` - Repository health monitoring

## Future Enhancements

Potential improvements:
- Calendar integration (Google Calendar, etc.)
- Social media mentions summary
- GitHub activity digest (commits, PRs, issues)
- Personalized motivational quotes
- Weekly/monthly summary mode
- Voice briefing via TTS
- Customizable template system
