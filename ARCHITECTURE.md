# OpenClaw / Ernestclaw - Architectural Reference Map

**Last Updated:** 2026-01-31
**Project Version:** 2026.1.29

---

## Overview

OpenClaw is a **personal AI assistant** that runs on your own devices, providing AI responses across multiple messaging platforms. Built with TypeScript, Node.js, and pnpm workspaces.

```
                    ┌─────────────────────────────────────┐
                    │         CLI Entry Point             │
                    │     (openclaw.mjs / run-node.mjs)   │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │          Main Application           │
                    │        (src/ → dist/)               │
                    └─────┬───────────────────────────┬───┘
                          │                           │
         ┌────────────────┴───────┐   ┌───────────────┴────────┐
         │    Core Systems        │   │    Channel Extensions  │
         ├────────────────────────┤   ├────────────────────────┤
         │ • Gateway              │   │ • Telegram             │
         │ • Agents (Pi)          │   │ • WhatsApp             │
         │ • Sessions             │   │ • Discord              │
         │ • Memory               │   │ • Slack                │
         │ • Browser Automation   │   │ • iMessage             │
         │ • Action Stream        │   │ • Signal, LINE, etc.   │
         │ • Canvas/UI            │   └────────────────────────┘
         │ • TUI (Terminal UI)     │
         └────────────────────────┘
                          │
         ┌────────────────┴────────────────────────────────┐
         │              Skills System (48+ skills)        │
         │  Coding, GitHub, Notion, Weather, Food, etc.   │
         └─────────────────────────────────────────────────┘
```

---

## Directory Structure

### 📁 Local Development Copy
**Path:** `C:\Users\ErnestHome\DEVPROJECTS\Ernestclaw\`

```
ernestclaw/
│
├── 📁 src/                          # 📝 SOURCE CODE (TypeScript)
│   ├── acp/                         # Agent Client Protocol implementation
│   ├── agents/                      # AI Agent system (Pi integration)
│   ├── auto-reply/                  # Automated response handling
│   │   ├── commands-*.ts            # Command registry and handlers
│   │   ├── reply/                   # Reply execution logic
│   │   ├── chunk.ts                # Message chunking
│   ├── browser/                     # Browser automation (Playwright)
│   ├── canvas-host/                 # Canvas rendering for UI
│   │   └── a2ui/                    # A2UI bundle (537.64 kB)
│   ├── channels/                    # Message channel routing layer
│   │   ├── dock.ts                 # Channel docking system
│   │   └── [channel-impls]
│   ├── cli/                         # Command-line interface
│   ├── commands/                    # CLI command implementations
│   ├── config/                      # Configuration management
│   ├── cron/                        # Scheduled task system
│   ├── daemon/                      # Background service daemon
│   ├── discord/                     # Discord integration
│   ├── gateway/                     # Gateway service (port 18789)
│   │   ├── server-browser.ts       # Gateway WebSocket server
│   │   └── server-methods/          # RPC method handlers
│   │       ├── action-stream.ts    # Action stream RPC
│   │       ├── dashboard.ts        # Dashboard RPC
│   │       └── ...
│   ├── hooks/                       # Webhook handlers
│   ├── imessage/                    # iMessage integration
│   ├── infra/                       # Infrastructure utilities
│   │   ├── action-stream-*.ts      # Action stream implementation
│   │   │   ├── store.ts             # Circular buffer store
│   │   │   ├── types.ts             # Event type definitions
│   │   │   └── aggregator.ts       # Event aggregation
│   │   └── ...
│   ├── line/                        # LINE messenger
│   ├── media/                       # Media processing (Sharp)
│   ├── plugins/                     # Plugin system
│   ├── plugin-sdk/                  # Plugin development kit
│   ├── routing/                     # Multi-agent routing
│   ├── sessions/                    # Session management
│   ├── signal/                      # Signal messaging
│   ├── slack/                       # Slack integration
│   ├── telegram/                    # Telegram bot (Grammy.js)
│   ├── tui/                         # Terminal UI (pi-tui)
│   │   ├── components/              # TUI React components
│   │   │   ├── action-stream-panel.ts
│   │   │   ├── chat-log.ts
│   │   │   └── selectors.ts
│   │   ├── tui-command-handlers.ts # Command handling
│   │   ├── tui-lifecycle.ts         # Lifecycle management
│   │   └── tui-status-summary.ts    # Status formatting
│   ├── whatsapp/                    # WhatsApp (Baileys)
│   └── web/                         # Web interface
│       └── gateway-chat.ts          # Gateway client for UI
│
├── 📁 packages/                     # 📦 PNPM WORKSPACE PACKAGES
│   ├── clawdbot/                    # Compatibility shim (renames to openclaw)
│   └── moltbot/                     # Additional bot implementation
│
├── 📁 extensions/                   # 🔌 CHANNEL EXTENSIONS (29 total)
│   ├── bluebubbles/                 # iMessage via BlueBubbles
│   ├── discord/                     # Discord extension
│   ├── google-gemini-cli/           # Google Gemini CLI auth
│   ├── imessage/                    # iMessage extension
│   ├── llm-task/                    # LLM task automation
│   ├── matrix/                      # Matrix protocol
│   ├── msteams/                     # Microsoft Teams
│   ├── memory-core/                 # Core memory storage
│   ├── memory-lancedb/              # LanceDB memory backend
│   ├── nextcloud-talk/              # Nextcloud Talk
│   └── [26 more extensions...]
│
├── 📁 skills/                       # 🤖 AI SKILLS (48+ skills)
│   ├── 1password/                   # 1Password integration
│   ├── apple-notes/                 # Apple Notes
│   ├── apple-reminders/             # Apple Reminders
│   ├── bear-notes/                  # Bear Notes
│   ├── coding-agent/                # AI coding assistant
│   ├── discord/                     # Discord skills
│   ├── food-order/                  # Food ordering
│   ├── gemini/                      # Google Gemini
│   ├── github/                      # GitHub integration
│   ├── kanban/                      # Kanban board
│   ├── notion/                      # Notion integration
│   ├── obsidian/                    # Obsidian notes
│   ├── openai-image-gen/            # DALL-E image generation
│   ├── openai-whisper/              # Whisper speech-to-text
│   ├── spotify-player/              # Spotify control
│   ├── summarise/                   # Text summarization
│   ├── weather/                     # Weather information
│   └── [31 more skills...]
│
├── 📁 apps/                         # 📱 MOBILE APPLICATIONS
│   ├── android/                     # Android app (Gradle/Kotlin)
│   ├── ios/                         # iOS app (Xcode/Swift)
│   ├── macos/                       # macOS desktop app
│   └── shared/                      # Shared cross-platform code
│       └── OpenClawKit/             # Shared framework
│           └── Tools/CanvasA2UI/    # Canvas UI components
│
├── 📁 ui/                           # 🎨 CONTROL UI (separate package)
│   ├── src/                         # UI source code
│   │   ├── ui/                      # Main UI components
│   │   │   ├── app.ts               # Main app component
│   │   │   ├── app-action-stream.ts # Action stream controller
│   │   │   ├── app-gateway.ts       # Gateway event handlers
│   │   │   ├── views/                # UI views
│   │   │   │   ├── action-stream.ts # Action stream view
│   │   │   │   ├── chat.ts
│   │   │   │   ├── channels.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   └── ...
│   │   │   └── components/          # Reusable components
│   │   └── styles/                  # CSS styles
│   └── dist/control-ui/             # Built UI assets
│
├── 📁 ui-next/                     # 🚧 NEXT-GEN UI (in development)
│   └── (Next.js-based UI - experimental)
│
├── 📁 scripts/                      # 🔧 BUILD & UTILITY SCRIPTS
│   ├── bundle-a2ui.sh               # A2UI bundler (rolldown)
│   ├── canvas-a2ui-copy.ts          # Copy A2UI to dist
│   ├── copy-hook-metadata.ts        # Copy hook metadata
│   ├── docs-list.js                 # Generate docs list
│   ├── postinstall.js               # Post-install setup
│   ├── run-node.mjs                 # ⭐ MAIN ENTRY POINT
│   ├── sync-plugin-versions.ts      # Sync plugin versions
│   ├── watch-node.mjs               # Watch mode for dev
│   └── write-build-info.ts          # Write build metadata
│
├── 📁 vendor/                       # 📦 THIRD-PARTY CODE
│   └── a2ui/renderers/lit/          # A2UI renderer sources
│
├── 📁 test/                         # 🧪 TEST FILES
├── 📁 assets/                       # 🖼️ STATIC ASSETS
├── 📁 docs/                         # 📚 DOCUMENTATION
│   ├── _layouts/                   # Jekyll layouts
│   ├── action-stream.md             # ⭐ Action stream docs (NEW)
│   ├── auto-reply/                  # ⭐ Auto-reply docs (NEW)
│   │   ├── index.md
│   │   ├── commands.md
│   │   ├── queue.md
│   │   └── config.md
│   ├── automation/                  # Automation docs
│   │   ├── cron-jobs.md
│   │   ├── webhook.md
│   │   └── ...
│   ├── channels/                    # Channel-specific docs
│   ├── cli/                         # CLI documentation
│   │   └── tui.md                  # TUI quick reference
│   ├── concepts/                    # Concept docs
│   ├── gateway/                     # Gateway docs
│   ├── install/                     # Installation docs
│   ├── platforms/                   # Platform docs
│   ├── plugins/                     # Plugin docs
│   ├── reference/                   # Reference docs
│   ├── start/                       # Getting started
│   ├── tui/                         # ⭐ TUI documentation (NEW)
│   │   ├── index.md
│   │   ├── commands.md
│   │   ├── action-stream.md
│   │   └── keybindings.md
│   ├── tools/                       # Tools & skills docs
│   ├── web/                         # Web UI docs
│   │   └── control-ui.md           # Updated with action stream
│   ├── index.md                     # Main index (updated)
│   └── plans/                       # Implementation plans
│       └── 2026-01-31-live-action-stream.md
│
├── 📁 patches/                      # 🩹 DEPENDENCY PATCHES
│
├── 📁 dist/                         # ✅ BUILT OUTPUT (TypeScript → JS)
│   ├── control-ui/                  # Built UI assets
│   ├── [all compiled src/]
│   └── index.js                     # Main entry point
│
├── 📁 node_modules/                 # 📦 DEPENDENCIES (1032 packages)
│
├── 📄 package.json                  # Main package config
├── 📄 pnpm-workspace.yaml           # Workspace config
├── 📄 tsconfig.json                 # TypeScript config
├── 📄 vitest.config.ts              # Test config
├── 📄 openclaw.mjs                  # CLI entry point
├── 📄 CLAUDE.md                     # Project instructions
└── 📄 ARCHITECTURE.md               # This file
```

---

## 📁 Documentation Structure

### Complete Documentation Map

```
docs/
├── 📄 index.md                     # Main index with navigation
│
├── 📁 start/                       # Getting Started
│   ├── getting-started.md
│   ├── wizard.md
│   ├── hubs.md
│   ├── pairing.md
│   └── openclaw.md
│
├── 📁 install/                     # Installation
│   ├── index.md
│   ├── updating.md
│   └── nix.md
│
├── 📁 concepts/                    # Core Concepts
│   ├── architecture.md
│   ├── groups.md
│   ├── multi-agent.md
│   ├── session.md
│   ├── streaming.md
│   └── group-messages.md
│
├── 📁 cli/                         # CLI Documentation
│   └── tui.md                      # TUI quick reference
│
├── 📁 tui/                         # ⭐ NEW: TUI Full Documentation
│   ├── index.md                     # TUI overview & concepts
│   ├── commands.md                  # All TUI commands
│   ├── action-stream.md             # TUI action stream panel
│   └── keybindings.md               # Keyboard shortcuts
│
├── 📁 channels/                    # Channel Documentation
│   ├── whatsapp/
│   ├── telegram/
│   ├── discord/
│   ├── slack/
│   ├── imessage/
│   ├── signal/
│   └── ...
│
├── 📁 web/                         # Web UI Documentation
│   ├── control-ui.md               # Updated with action stream
│   ├── webchat.md
│   └── dashboard.md
│
├── 📁 gateway/                     # Gateway Documentation
│   ├── configuration.md
│   ├── configuration-examples.md
│   ├── multiple-gateways.md
│   ├── remote.md
│   ├── tailscale.md
│   ├── security.md
│   └── troubleshooting.md
│
├── 📁 automation/                  # Automation Features
│   ├── cron-jobs.md
│   ├── webhook.md
│   ├── gmail-pubsub.md
│   ├── poll.md
│   └── auth-monitoring.md
│
├── 📁 tools/                       # Tools & Skills
│   ├── slash-commands.md
│   ├── skills.md
│   ├── skills-config.md
│   └── browser.md
│
├── 📁 auto-reply/                  # ⭐ NEW: Auto-Reply System
│   ├── index.md                     # Overview & architecture
│   ├── commands.md                  # All slash commands
│   ├── queue.md                     # Queue management
│   └── config.md                    # Configuration reference
│
├── 📄 action-stream.md             # ⭐ NEW: Live Action Stream
│
├── 📁 platforms/                   # Platform-Specific
│   ├── macos.md
│   ├── ios.md
│   ├── android.md
│   ├── windows.md
│   └── linux.md
│
├── 📁 plugins/                     # Plugin System
│   └── ...
│
├── 📁 reference/                   # Reference Docs
│   ├── rpc.md
│   ├── templates/
│   └── ...
│
└── 📁 nodes/                       # Mobile Nodes
    └── ...
```

---

## 📁 Runtime State Directory

**Path:** `C:\Users\ErnestHome\.openclaw\`

This is where OpenClaw stores **runtime data, configuration, and state**.

```
.openclaw/
│
├── 📁 agents/                       # 🤖 AGENT WORKSPACE
│   ├── main/                        # Main agent instance data
│   └── beta/                        # Beta/experimental instances
│
├── 📁 identity/                     # 🔐 DEVICE IDENTITY
│   ├── device.json                  # Device ID & crypto keys
│   └── device-auth.json             # Device authentication
│
├── 📁 memory/                       # 🧠 MEMORY STORAGE
│   └── (Vector & conversation memory)
│
├── 📁 sessions/                     # 💬 SESSION STATE
│   └── (Active session data)
│
├── 📁 skills/                       # 🤹 SKILLS RUNTIME
│   ├── job-hunter/                  # Job hunting skill data
│   └── kanban/                      # Kanban board state
│
├── 📁 subagents/                    # 👥 SUB-AGENT TRACKING
│   └── runs.json                    # Execution history
│
├── 📁 cron/                         # ⏰ SCHEDULED JOBS
│   ├── jobs.json                    # Cron job definitions
│   └── runs/                        # Execution logs
│
├── 📁 browser/                      # 🌐 BROWSER STATE
│   └── (Playwright profiles)
│
├── 📁 credentials/                  # 🔑 SECURE CREDENTIALS
├── 📁 devices/                      # 📱 PAIRED DEVICES
├── 📁 logs/                         # 📋 LOG FILES
│   └── commands.log                 # Command history
├── 📁 media/                        # 🖼️ MEDIA CACHE
├── 📁 sandbox/                      # 🛡️ SANDBOX DATA
├── 📁 patches/                      # 🩹 APPLIED PATCHES
├── 📁 telegram/                     # ✈️ TELEGRAM STATE
│   └── (Bot data, media cache)
├── 📁 token-analytics/              # 📊 TOKEN USAGE
├── 📁 canvas/                       # 🎨 CANVAS RESOURCES
│
├── ⚙️ openclaw.json                 # ⭐ MAIN CONFIGURATION
├── ⚙️ clawdbot.json                 # Bot-specific config
├── ⚙️ exec-approvals.json           # Command approvals
├── ⚙️ update-check.json             # Update tracking
└── 🔒 gateway.*.lock                # Process locks
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `openclaw.json` | Main config: auth, models, gateway, channels, memory |
| `clawdbot.json` | Alternative bot configuration |
| `device.json` | Device identity & cryptographic keys |
| `exec-approvals.json` | Execution approval policies |

---

## 🎯 "I want to..." → "Look here..."

| I want to... | Look here | File/Folder |
|--------------|-----------|-------------|
| **Find documentation** | `docs/` | Documentation index |
| **Understand Action Stream** | `docs/action-stream.md` | Action stream docs |
| **Learn TUI commands** | `docs/tui/commands.md` | TUI command reference |
| **Configure Auto-Reply** | `docs/auto-reply/config.md` | Auto-reply config |
| **Edit core functionality** | `ernestclaw/src/` | All TypeScript source |
| **Add a new command** | `ernestclaw/src/commands/` | Command files |
| **Modify Action Stream** | `ernestclaw/src/infra/action-stream-*` | Action stream impl |
| **Modify TUI** | `ernestclaw/src/tui/` | TUI source |
| **Update Web UI** | `ernestclaw/ui/src/ui/` | Control UI source |
| **Modify Gateway RPC** | `ernestclaw/src/gateway/server-methods/` | RPC handlers |
| **Modify Telegram bot** | `ernestclaw/src/telegram/` | Telegram integration |
| **Change Gateway behavior** | `ernestclaw/src/gateway/` | Gateway service |
| **Add a new skill** | `ernestclaw/skills/` | Skills directory |
| **Build the project** | Run `pnpm build` | Uses `scripts/` |
| **Change configuration** | `.openclaw/openclaw.json` | Main config |
| **View agent memory** | `.openclaw/memory/` | Memory storage |
| **Check logs** | `.openclaw/logs/` | Log files |
| **See scheduled jobs** | `.openclaw/cron/jobs.json` | Cron definitions |
| **Modify mobile apps** | `ernestclaw/apps/` | iOS/Android/macOS |
| **Add channel extension** | `ernestclaw/extensions/` | Extension templates |
| **Debug build issues** | `ernestclaw/dist/` | Compiled output |
| **Update dependencies** | `ernestclaw/package.json` | Package manifest |

---

## 🔄 Build System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD PROCESS                           │
└─────────────────────────────────────────────────────────────────┘

1. pnpm canvas:a2ui:bundle
   └──> scripts/bundle-a2ui.sh
       ├──> tsc (A2UI TypeScript)
       └──> rolldown (bundle to a2ui.bundle.js, 537.64 kB)

2. tsc -p tsconfig.json
   └──> Compiles src/ to dist/ (TypeScript → JavaScript)

3. node --import tsx scripts/canvas-a2ui-copy.ts
   └──> Copies A2UI bundle to dist/

4. node --import tsx scripts/copy-hook-metadata.ts
   └──> Copies HOOK.md from plugins to dist/

5. node --import tsx scripts/write-build-info.ts
   └──> Writes build metadata
```

---

## 🚀 Running the Application

### From Project Directory (Development)
```powershell
cd C:\Users\ErnestHome\DEVPROJECTS\Ernestclaw
pnpm start gateway          # Start gateway
pnpm start tui              # Start TUI
pnpm gateway:dev            # Dev mode (no channels)
pnpm gateway:watch          # Watch mode (hot reload)
pnpm ui:dev                  # UI dev server
```

### From Anywhere (Global Command)
```powershell
# After linking your local build:
cd C:\Users\ErnestHome\DEVPROJECTS\Ernestclaw
pnpm link --global

# Now you can run from anywhere:
openclaw gateway
openclaw tui
```

---

## 🛠️ Key Technologies

| Category | Technology | Version |
|----------|-----------|---------|
| **Runtime** | Node.js | ≥22.12.0 |
| **Language** | TypeScript | 5.9.3 |
| **Package Manager** | pnpm | 10.23.0 |
| **Testing** | Vitest | 4.0.18 |
| **Web Framework** | Hono | 4.11.4 |
| | Express | 5.2.1 |
| **Browser Automation** | Playwright | 1.58.0 |
| **Image Processing** | Sharp | 0.34.5 |
| **AI/Agents** | @mariozechner/pi-* | 0.49.3 |
| **TUI Framework** | @mariozechner/pi-tui | Latest |
| **WhatsApp** | @whiskeysockets/baileys | Latest |
| **Telegram** | Grammy | 1.39.3 |
| **UI Framework** | Lit | 3.3.2 |
| **Build** | Rolldown | 1.0.0-rc.1 |

---

## 📊 Current Configuration

| Setting | Value |
|---------|-------|
| **Gateway** | `ws://127.0.0.1:18789` |
| **Model** | `zai/glm-4.7` (128k token limit) |
| **Telegram Bot** | @Kernest_bot |
| **Memory** | Search sources: memory + sessions |
| **Concurrent** | 4 main agents, 8 subagents |

---

## 📝 Recently Modified Files (Git Status)

```
M  package.json
M  src/auto-reply/commands-registry.data.ts
M  src/auto-reply/reply/abort.ts
M  src/auto-reply/reply/commands-core.ts
M  src/auto-reply/reply/commands-info.ts
M  src/auto-reply/reply/commands.ts
M  src/gateway/server-browser.ts
M  src/infra/exec-approvals.ts
M  src/infra/node-shell.ts
M  src/telegram/bot-handlers.ts
M  ui/src/styles/base.css
M  ui/src/styles/components.css
M  ui/src/styles/layout.css
M  ui/src/ui/icons.ts
?? src/auto-reply/reply/adaptive-debounce.ts
?? src/auto-reply/reply/commands-queueinfo.ts
?? src/gateway/server-methods/dashboard.ts
?? src/tui/components/action-stream-panel.ts
?? ui/src/ui/app-action-stream.ts
?? ui/src/ui/views/action-stream.ts
```

---

## 🆕 New Features (Recent)

### Action Stream System
- **Implementation:** Complete real-time activity monitoring
- **Files:**
  - `src/infra/action-stream-*.ts` - Core implementation
  - `src/gateway/server-methods/action-stream.ts` - Gateway RPC
  - `src/tui/components/action-stream-panel.ts` - TUI panel
  - `ui/src/ui/views/action-stream.ts` - Web UI view
  - `ui/src/ui/app-action-stream.ts` - UI controller
- **Docs:** `docs/action-stream.md`, `docs/tui/action-stream.md`

### Auto-Reply System Enhancements
- **Implementation:** Command queue management, adaptive debouncing
- **Files:**
  - `src/auto-reply/reply/adaptive-debounce.ts`
  - `src/auto-reply/reply/commands-queueinfo.ts`
- **Docs:** `docs/auto-reply/`

---

## 🔍 Finding Files by Feature

| Feature | Primary Location | Docs |
|---------|------------------|------|
| **Action Stream** | `src/infra/action-stream-*.ts` | `docs/action-stream.md` |
| **Gateway RPC** | `src/gateway/server-methods/*.ts` | `docs/gateway/` |
| **TUI** | `src/tui/` | `docs/tui/` |
| **Auto-Reply** | `src/auto-reply/` | `docs/auto-reply/` |
| **Channels** | `src/channels/` | `docs/channels/` |
| **Commands** | `src/commands/` | `docs/cli/` |
| **Config** | `src/config/` | `docs/gateway/configuration.md` |
| **Sessions** | `src/sessions/` | `docs/concepts/session` |
| **Skills** | `skills/` | `docs/tools/skills.md` |
| **Web UI** | `ui/src/ui/` | `docs/web/` |
| **Browser Automation** | `src/browser/` | `docs/tools/browser.md` |
| **Cron Jobs** | `src/cron/` | `docs/automation/cron-jobs.md` |

---

## 📚 Documentation Index

All documentation is now 100% covered with:

1. **Getting Started** - `docs/start/`
2. **Installation** - `docs/install/`
3. **Concepts** - `docs/concepts/`
4. **CLI & TUI** - `docs/cli/`, `docs/tui/`
5. **Channels** - `docs/channels/`
6. **Gateway** - `docs/gateway/`
7. **Web UI** - `docs/web/`
8. **Automation** - `docs/automation/`
9. **Tools** - `docs/tools/`
10. **Platforms** - `docs/platforms/`
11. **Plugins** - `docs/plugins/`
12. **Reference** - `docs/reference/`
13. **Action Stream** - `docs/action-stream.md` ⭐ NEW
14. **Auto-Reply** - `docs/auto-reply/` ⭐ NEW

---

*This reference map is maintained in ARCHITECTURE.md - update it when making structural changes.*
