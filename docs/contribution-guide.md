# Contributing to VibeGPT

## Branch Conventions

- `main` — stable production code
- `develop` — integrated development
- `feature/*` — new features
- `fix/*` — bug fixes
- `docs/*` — documentation changes

## Pull Request Template

Every PR must include:
- What was implemented
- Screenshots (if UI changed)
- Testing performed
- Environment variable changes
- Database migration details
- Known limitations

## Code Style

- **Python**: Use ruff for formatting and linting
- **TypeScript**: ESLint with Next.js config
- **Dart**: `flutter analyze` must pass

## Commit Messages

Use conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks
