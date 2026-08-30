# Workspace Rules & Coding Standards

## 1. Programming Paradigm

- **Prefer Functional over Classes**: Use functional programming patterns and pure functions across all domain services, utilities, and helpers. Avoid classes unless they are strictly required by third-party libraries or established framework conventions.
- **Prefer Arrow Functions**: Use arrow functions (`const fn = (...) => { ... }`) for function declarations, helpers, hooks, and React functional components.

## 2. Clean Code Principles

- Always adhere to the `clean-code` skill guidelines (Uncle Bob / Robert C. Martin):
  - **The Boy Scout Rule**: Leave the code cleaner than you found it.
  - **Single Responsibility Principle**: Each function should do one thing well. Keep functions small, focused, and operating at a single level of abstraction.
  - **Self-Documenting & Expressive**: Name variables, functions, and modules descriptively to convey intent without relying on redundant comments.
  - **Pure Functions & Immutability**: Favour side-effect-free functions and immutable data transformations.

## 3. General & Language Conventions

- **Package Manager**: Always use `pnpm` for running scripts, installing dependencies, and building the project.
- **Language**: Use British English for all user-facing copy, messages, and UI text.
