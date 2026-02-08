# TUI Key Bindings

Complete reference for all keyboard shortcuts in the Terminal UI.

## Input & Navigation

| Key | Action | Description |
|-----|--------|-------------|
| **Enter** | Send message | Submit the current input to the agent |
| **Esc** | Abort run | Stop the currently active agent run |
| **Ctrl+C** | Clear input / Exit | Clear input (first press), exit TUI (second press) |
| **Ctrl+D** | Exit | Immediately exit the TUI |

## Pickers & Panels

| Key | Action | Description |
|-----|--------|-------------|
| **Ctrl+L** | Model picker | Open model selection picker |
| **Ctrl+G** | Agent picker | Open agent selection picker |
| **Ctrl+P** | Session picker | Open session selection picker |
| **Ctrl+O** | Toggle tool output | Switch between collapsed/expanded tool cards |

## Display Options

| Key | Action | Description |
|-----|--------|-------------|
| **Ctrl+T** | Toggle thinking | Show/hide thinking in chat log (reloads history) |

## Picker Navigation

When a picker is open, use these keys:

| Key | Action | Description |
|-----|--------|-------------|
| **↑ / ↓** | Navigate | Move up/down through the list |
| **PgUp / PgDn** | Page | Move up/down by page |
| **Home / End** | Jump to ends | Go to top/bottom of list |
| **Type** | Filter | Filter list by typing |
| **Enter** | Select | Confirm selection |
| **Esc** | Cancel | Close picker without selecting |

## Action Stream Panel

When the Action Stream panel is open (`/stream`):

| Key | Action | Description |
|-----|--------|-------------|
| **r** | Refresh | Manually refresh the action list |
| **f** | Filter | Open filter dialog |
| **q** | Quit | Close the panel |

## Input Editing

The TUI input supports standard terminal editing:

| Key | Action | Description |
|-----|--------|-------------|
| **← / →** | Move cursor | Move cursor left/right |
| **Ctrl+A** | Start of line | Move cursor to beginning |
| **Ctrl+E** | End of line | Move cursor to end |
| **Ctrl+K** | Kill to end | Delete from cursor to end of line |
| **Ctrl+U** | Kill to start | Delete from start to cursor |
| **Ctrl+W** | Delete word | Delete word before cursor |
| **Ctrl+H** | Backspace | Delete character before cursor |
| **Ctrl+D** | Delete | Delete character at cursor |

## Quick Reference

### Essential Shortcuts

```
Enter      → Send message
Esc        → Abort run
Ctrl+L     → Change model
Ctrl+G     → Change agent
Ctrl+P     → Change session
Ctrl+O     → Expand/collapse tools
Ctrl+C ×2  → Exit
```

### Picker Shortcuts

```
Ctrl+L     → Model picker
Ctrl+G     → Agent picker
Ctrl+P     → Session picker
↑/↓        → Navigate
Enter      → Select
Esc        → Cancel
```

## See Also

- [**TUI Overview**](index.md) - TUI introduction
- [**TUI Commands**](commands.md) - Slash command reference
- [**Action Stream Panel**](action-stream.md) - Action stream controls
