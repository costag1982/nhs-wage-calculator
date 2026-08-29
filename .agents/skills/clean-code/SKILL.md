---
name: clean-code
description: Use this skill when reviewing, writing, or refactoring code for cleanliness and maintainability following Robert C. Martin's (Uncle Bob) Clean Code principles.
---

# Clean Code Guidelines (Robert C. Martin)

## Key Principles

1. **The Boy Scout Rule**: Leave the code cleaner than you found it.
2. **Readability is King**: Code should read like well-written prose.
3. **Single Responsibility Principle**: Every function does one thing, every class has one reason to change, every module has one domain of responsibility.
4. **Express Intent, Don't Document It**: Code itself should explain what and why. Avoid redundant comments.
5. **Small is Beautiful**: Functions should be short (5-20 lines), focused, and operate at a single level of abstraction.

## Core Concepts

- **Meaningful Names**: Intention-revealing, pronounceable, searchable, distinct names.
- **Function Structure**: Small, single-purpose, few arguments (0-2 preferred), no side effects.
- **SOLID Design**:
  - **S**ingle Responsibility Principle
  - **O**pen/Closed Principle
  - **L**iskov Substitution Principle
  - **I**nterface Segregation Principle
  - **D**ependency Inversion Principle
- **Test-Driven Development (TDD)**: Fast, isolated, repeatable unit tests covering domain rules and calculations.
- **Error Handling**: Use descriptive custom errors/types or explicit result objects rather than returning null or obscure error codes.
