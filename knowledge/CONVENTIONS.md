# Coding Conventions

> **Configure for your project.** This file captures coding conventions that Claude should follow. The `/scout` and `/review` skills reference this file. Delete examples and replace with your project's actual conventions.

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `LoginForm`, `UserAvatar` |
| Functions | camelCase | `getUserById`, `formatDate` |
| Constants | UPPER_SNAKE | `MAX_RETRIES`, `API_BASE_URL` |
| Files (components) | PascalCase | `LoginForm.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| Test files | Same name + `.test` | `LoginForm.test.tsx` |
| CSS/styles | kebab-case or module | `login-form.module.css` |

## Patterns

### Preferred
- Named exports over default exports
- Composition over inheritance
- Small functions (< 30 lines)
- Early returns over nested conditionals
- Explicit error handling at system boundaries

### Avoided
- `any` type in TypeScript — use `unknown` and narrow
- Barrel files (`index.ts` re-exports) — import directly
- God components (> 200 lines) — split into Container/Presenter
- Mutable global state — use context or state management

## Imports

```
Order:
1. Node/framework built-ins (react, next, node:fs)
2. Third-party packages (zod, date-fns, lodash)
3. Project aliases (@/components, @/utils)
4. Relative imports (./hooks, ../types)

Blank line between each group.
```

## Error Handling

- Handle errors at system boundaries (API calls, user input, file I/O)
- Trust internal code — don't defensive-code every function call
- Use typed errors, not string messages
- Log errors with context (what was attempted, what input caused it)

## Testing

- Test behavior, not implementation
- One assertion per test (or closely related group)
- Mock at system boundaries only (API, database, file system)
- Prefer integration tests for UI components
- Use `describe` blocks to group by feature, not by function

## Comments

- Don't comment what the code does — make the code self-explanatory
- Do comment WHY when the reason isn't obvious
- TODOs must include a name or ticket: `// TODO(igor): migrate to v2 API`
- Delete commented-out code — git has history
