# Test Inventory
{{Line 1: how unit/integration tests run, the exact command, and the runner (name the tool so an agent does not guess Jest when the repo uses something else).}}
{{Line 2: where test files live (colocated or separate tree), the naming pattern, and any rendering/environment approach.}}
{{Line 3: the areas with the heaviest coverage, named concretely.}}
{{Line 4: what else is covered, by module or contract name.}}
{{Line 5: UNCOVERED: the largest honest coverage gaps, named. This line is the point of the file.}}
{{Line 6: UNCOVERED: the remaining gaps and what compensates for them (e2e evidence, manual QA, type safety).}}
---

## How to use this file

Every new test file gets a row here in the same commit that adds it. Keep the UNCOVERED lines honest and current: they are what a reviewer reads to know whether a green test run means anything. Overstated coverage is a review finding (the AI-smells persona owns this file).

## Commands

```bash
{{FULL TEST COMMAND}}
{{FOCUSED TEST COMMAND, e.g. single file or filter}}
```

## Inventory

| Test file | Verifies |
|---|---|
| `{{path/to/thing.test.ts}}` | {{Behavior asserted, not "tests the thing".}} |

## Known gaps

- {{Area with no tests, and what covers it instead (e2e, manual QA, type checking, nothing).}}
