# CLAUDE.md — AI Assistant Guide for plmhelper

## Project Overview

**plmhelper** is a Turkish-language interactive Git CLI helper with AI-powered commit message suggestions. It provides an enhanced git workflow through an interactive dashboard, multiple AI provider integrations, and configurable user profiles.

- **Package name:** `plmhelper` (binaries: `plmhelper`, `plm`)
- **Language:** TypeScript (strict mode, ES2020 target, CommonJS output)
- **Node requirement:** >=16.0.0
- **License:** MIT

## Quick Reference — Build & Run

```bash
npm run build        # Compile TypeScript (tsc) → dist/
npm run start        # Run compiled CLI (node dist/index.js)
npm run dev          # Run from source (ts-node src/index.ts)
```

There are **no tests, linters, or CI/CD pipelines** configured. Verify changes manually by running `npm run build` to check for TypeScript compilation errors, then test interactively via `npm run dev`.

## Repository Structure

```
src/
├── index.ts                  # CLI entry point — Commander.js command routing
├── ai/
│   ├── ai-provider.ts        # AIProvider interface + 7 provider implementations
│   └── suggest.ts            # Commit message generation (AI + local fallback)
├── commands/                  # One file per CLI command/feature
│   ├── dashboard.ts           # Main interactive menu loop (default command)
│   ├── commit.ts              # Interactive commit workflow
│   ├── push.ts                # Push to remote
│   ├── branch.ts              # Branch management
│   ├── stash.ts               # Stash management
│   ├── tag.ts                 # Tag management
│   ├── merge.ts               # Merge/rebase/conflict resolution
│   ├── init.ts                # Repository init & clone
│   ├── gitignore.ts           # .gitignore template management
│   ├── status.ts              # Status display
│   ├── history.ts             # Commit history viewer
│   ├── settings.ts            # Settings/profiles/AI configuration
│   ├── security.ts            # Security scanning
│   ├── analytics.ts           # Repository analytics
│   └── advanced.ts            # Advanced git operations
├── config/
│   ├── settings.ts            # PlmConfig interface, load/save, profiles, features
│   └── themes.ts              # 4 theme definitions (default, dark, light, ocean)
├── git/
│   └── operations.ts          # GitOperations class wrapping simple-git
└── ui/
    ├── display.ts             # Chalk/Boxen formatted output utilities
    └── prompts.ts             # Inquirer.js prompt wrappers
dist/                          # Compiled output (committed to repo)
```

## Architecture

### Entry Flow

```
CLI invocation
  → No args: showDashboard() — interactive menu loop
  → With args: Commander.js routes to specific command handler
```

### Key Patterns

1. **Modular commands:** Each command lives in its own file under `src/commands/`. Commands export two functions:
   - `commandName()` — CLI entry point (called by Commander.js)
   - `commandNameMenu()` — Dashboard submenu entry (returns `boolean` for menu loop control)

2. **Singleton git operations:** `src/git/operations.ts` exports a shared `gitOps` instance of `GitOperations` class that wraps `simple-git`.

3. **Configuration-driven features:** Features are gated by user profiles (standard/expert/custom). The config is stored as JSON in `.plmhelperrc` (local) or `~/.plmhelperrc` (global).

4. **AI provider pattern:** `AIProvider` interface with `generateCommitMessage()` and `testConnection()`. Seven providers implemented: Groq, Gemini, DeepSeek, OpenAI, Anthropic, MiniMax, Ollama. Falls back to local diff analysis on failure.

5. **Interactive-first:** The dashboard is a `while(running)` loop with Inquirer.js menus. All submenus follow the same loop pattern.

### Key Types (src/config/settings.ts, src/git/operations.ts)

```typescript
type ProfileType = 'standard' | 'expert' | 'custom';
type ThemeType = 'default' | 'dark' | 'light' | 'ocean';
type AIProviderType = 'none' | 'groq' | 'gemini' | 'deepseek' | 'openai' | 'anthropic' | 'minimax' | 'ollama';

interface PlmConfig {
    profile: ProfileType;
    customFeatures: string[];
    theme: ThemeType;
    language: 'tr' | 'en';
    aliases: Record<string, string>;
    favorites: string[];
    conventionalCommit: boolean;
    aiProvider: AIProviderType;
    aiApiKey?: string;
    aiModel?: string;
    aiEnabled: boolean;
}

interface GitStatus { branch, staged, modified, untracked, ahead, behind, isClean }
interface CommitInfo { hash, date, message, author }
interface BranchInfo { name, current, commit, label }
interface StashInfo { index, message, date }
interface TagInfo { name, commit }
interface ConflictFile { file, status }
```

## Code Conventions

### Language & Localization

- **All user-facing strings are in Turkish.** Comments are also in Turkish. When adding features, maintain Turkish for UI text.
- The config supports `language: 'tr' | 'en'` but the codebase is predominantly Turkish.

### Naming

- **camelCase** for functions and variables (`showDashboard`, `interactiveCommit`)
- **PascalCase** for interfaces, types, and classes (`GitOperations`, `PlmConfig`, `AIProvider`)
- Descriptive names preferred over abbreviations

### TypeScript

- Full strict mode enabled (`"strict": true` in tsconfig.json)
- Type annotations on function parameters and return types
- Interfaces for all data structures
- `async/await` throughout — no raw Promise chains
- ESModuleInterop enabled (allows default imports from CommonJS modules)

### Error Handling

```typescript
try {
    const result = await gitOps.someOperation();
    displaySuccess('Mesaj');
} catch (error) {
    displayError(`İşlem başarısız: ${error}`);
    process.exit(1);  // For critical failures
}
```

- Try-catch in every command handler
- `displayError()` / `displaySuccess()` for user feedback
- Graceful degradation (e.g., AI failure → local analysis fallback)
- `process.exit(1)` only on unrecoverable errors

### UI Patterns

- `ora` spinners wrap async operations
- `chalk` for colored terminal output (themed via `src/config/themes.ts`)
- `boxen` for header boxes
- `inquirer` for all interactive prompts (list, checkbox, confirm, input)
- Every submenu includes a "back" / "exit" option
- Current state displayed before prompting user

### File Organization

- One primary export per file
- Inline imports for circular dependency avoidance (see `dashboard.ts` comments)
- No barrel exports (`index.ts` files in subdirectories)

## Dependencies

### Production
| Package | Purpose |
|---------|---------|
| `commander` | CLI argument parsing & command routing |
| `inquirer` + `@inquirer/prompts` | Interactive terminal prompts |
| `chalk` | Terminal string styling |
| `boxen` | Styled terminal boxes |
| `ora` | Terminal spinners |
| `simple-git` | Git command wrapper |

### Dev
| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler |
| `ts-node` | Run TypeScript directly |
| `@types/node`, `@types/inquirer` | Type definitions |

## Adding a New Command

1. Create `src/commands/newcommand.ts`
2. Export `newCommand()` (CLI entry) and `newCommandMenu()` (dashboard submenu)
3. Register the CLI command in `src/index.ts` via `program.command()`
4. Add dashboard menu entry in `src/commands/dashboard.ts`
5. If feature-gated, add to the appropriate profile in `src/config/settings.ts` (`STANDARD_FEATURES` or `EXPERT_FEATURES`)

## Adding a New AI Provider

1. Add the provider key to `AIProviderType` in `src/config/settings.ts`
2. Add provider config to `AI_PROVIDERS` in `src/ai/ai-provider.ts`
3. Implement the provider class following the `AIProvider` interface
4. Register in the provider factory function
5. Add to the settings menu in `src/commands/settings.ts`

## Configuration

User configuration is stored as JSON:
- **Local (per-project):** `.plmhelperrc` in the project root
- **Global:** `~/.plmhelperrc` in the user's home directory
- Local config merges over defaults; global config used as fallback

## Important Notes

- **No test suite exists.** Always verify changes compile (`npm run build`) and test interactively.
- **No linter configured.** Follow existing code style manually.
- **`dist/` is committed.** After making source changes, run `npm run build` and commit both `src/` and `dist/` changes.
- **API keys are stored in plaintext** in the config file — do not log or expose them.
- **The project targets CommonJS output** despite using ES2020 features. Use `import`/`export` syntax — TypeScript compiles to `require()`.
