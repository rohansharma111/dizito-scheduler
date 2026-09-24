# Test Tooling Decision

## Decision

Use **Vitest** as the TypeScript test runner for the commerce integration layer.

## Rationale

- Native TypeScript/ESM-friendly workflow suitable for the repository's Next.js codebase.
- Supports focused unit tests for pure commerce validation and mapper functions.
- Supports mocking for provider clients and database boundaries without requiring live marketplace credentials.
- Provides a straightforward CLI that can be added to CI after dependency and lockfile updates.

## Required implementation sequence

1. Add `vitest` and the repository's required TypeScript/runtime support packages as development dependencies.
2. Regenerate and commit `package-lock.json` using the repository's Node/npm toolchain.
3. Add a `test` script and a CI test step.
4. Start with deterministic tests for WooCommerce validation, payload mapping, idempotency-key handling, and reconciliation guards.
5. Add provider-contract tests using mocked WooCommerce responses.
6. Record lint, build, type-check, and test results from an actual CI run before labeling the WooCommerce flow production-ready.

## Current status

The repository currently has no test runner dependency or test script. This decision document intentionally does not add dependencies or claim that tests pass; dependency installation and lockfile regeneration must be performed in an environment with the repository's package manager available.
