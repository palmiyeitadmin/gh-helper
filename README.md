# Git Helper CLI

Interactive Git CLI helper with AI-powered commit message suggestions.

## Features

- 📊 **Status Dashboard** - View branch, staged/modified files, recent commits
- 🤖 **AI Commit Messages** - Auto-generated conventional commit suggestions
- 📝 **Interactive Commit** - Stage files and commit with guided workflow
- 📤 **Easy Push** - Push to GitHub with confirmation
- 📋 **History View** - See recent commits at a glance

## Installation

```bash
# Navigate to the tool directory
cd C:\tools\git-helper

# Install dependencies
npm install

# Build
npm run build

# Install globally (optional)
npm link
```

## Usage

### Interactive Mode (Recommended)

```bash
# From any git repository
git-helper
```

This opens an interactive dashboard where you can:
- View status and recent commits
- Stage files
- Commit with AI-suggested messages
- Push to GitHub

### Commands

```bash
# Show detailed status
git-helper status

# Interactive commit with AI suggestions
git-helper commit

# Push to GitHub
git-helper push

# View commit history
git-helper history
git-helper history -n 20  # Show last 20 commits
```

## AI Commit Messages

The tool analyzes your staged files and generates conventional commit messages:

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test changes
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

Example suggestions:
- `feat(ui): add ProductSelector component`
- `fix: resolve TypeScript error in operations`
- `docs: update README documentation`

## Quick Workflow

```bash
# 1. Make changes to your code
# 2. Run git-helper
git-helper

# 3. Select "Stage files" if needed
# 4. Select "Commit staged files"
# 5. Review AI suggestion and confirm
# 6. Push to GitHub when prompted

# Done! 🎉
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build
```
