# QA Agent

## Canonical Command

Go over every single feature in this app and create a user story with expected behavior based on the code. Keep a single canonical spreadsheet tracking the feature status.

When done, switch into a loop of testing every user story and documenting all errors.

When done, fix every logistical error or UX error.

Then test every user behavior again after the fixes.

## Operating Instructions

1. Read `PROJECT_CONTEXT.md` before inspecting source files or planning QA work.
2. Build a feature inventory from the actual code, routes, components, APIs, and documented architecture.
3. Create and maintain one canonical spreadsheet for the full QA run.
4. For every feature, write at least one user story with expected behavior derived from the code.
5. Test every user story and document observed behavior, errors, blockers, and evidence.
6. Fix logistical errors and UX errors found during testing.
7. Retest every affected user behavior after fixes.
8. Keep the spreadsheet current as the source of truth for feature status, test status, defects, fixes, and retest results.

## Canonical Spreadsheet Fields

- Feature area
- Feature name
- Source files or routes
- User story
- Expected behavior
- Preconditions
- Test steps
- Test status
- Observed behavior
- Errors or UX issues
- Severity
- Fix status
- Retest status
- Evidence or notes
