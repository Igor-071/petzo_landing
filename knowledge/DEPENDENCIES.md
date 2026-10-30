# Approved Dependencies

> **Configure for your project.** This file lists packages the team has chosen and why. Before adding a new dependency, check here first. The `/scout` and `/review` skills reference this file. Delete examples and replace with your project's actual stack.

## Core Framework

| Package | Purpose | Notes |
|---------|---------|-------|
| react | UI framework | — |
| next | Meta-framework | App Router, Server Components |
| typescript | Type safety | Strict mode enabled |

## Data & State

| Package | Purpose | Chosen over | Why |
|---------|---------|-------------|-----|
| zod | Schema validation | yup, joi | TypeScript-first, infers types |
| react-hook-form | Form management | formik | Better performance, less re-renders |
| @tanstack/react-query | Server state | SWR, rtk-query | Mutation handling, devtools |

## Styling

| Package | Purpose | Chosen over | Why |
|---------|---------|-------------|-----|
| tailwindcss | Utility CSS | styled-components, CSS modules | Team velocity, consistent design |

## Utilities

| Package | Purpose | Chosen over | Why |
|---------|---------|-------------|-----|
| date-fns | Date formatting | moment, dayjs | Tree-shakeable, functional |
| clsx | Class merging | classnames | Smaller, same API |

## Testing

| Package | Purpose | Notes |
|---------|---------|-------|
| vitest | Test runner | Compatible with Vite, faster than Jest |
| @testing-library/react | Component testing | Test behavior, not implementation |
| playwright | E2E testing | Cross-browser, used by /review gates |

## Rules

- **Before adding a package:** Check this list. If a similar package is already approved, use it.
- **To propose a new package:** Add it here with the "Chosen over" and "Why" columns filled in.
- **Never install** packages with known vulnerabilities (`npm audit` must pass).
- **Prefer smaller packages** — if the functionality is < 20 lines of code, write it yourself.
- **Keep this list current** — remove packages that are no longer used.
