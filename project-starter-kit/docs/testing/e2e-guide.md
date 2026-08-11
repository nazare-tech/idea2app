# E2E Guide
{{Line 1: the e2e framework, where specs live, and the two tiers (free smoke tier and any gated tier that spends money or creates real data).}}
{{Line 2: how the config loads local credentials and whether it reuses a running dev server or starts one; which browsers run.}}
{{Line 3: what the free tier must never do (calls that cost money, create entities, or start external generation), stated as hard rules.}}
{{Line 4: real-flow rule: no route patching, no fixtures, no auth bypass; specs sign in through the real flow with real test credentials.}}
{{Line 5: writing rules: locator strategy, expectation-based waiting instead of fixed sleeps, one user journey per test, skip-with-reason when preconditions are missing.}}
{{Line 6: every new spec gets a row in docs/testing/test-inventory.md in the same commit; asserting only that a page loaded is a false-confidence finding.}}
---

## How to use this file

Fill the header once the first spec exists. The two-tier split is the important part: a free tier that runs on every change, and a gated tier (`{{ENV FLAG}}=1`) for flows that spend money or create durable data.

## Commands

```bash
{{E2E COMMAND}}          # free tier
{{GATED E2E COMMAND}}    # paid or data-creating tier
```

## Credentials

Test credentials come from a git-ignored env file (for example `.env.e2e.local` with `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`), loaded by the e2e config itself. Never print, commit, or screenshot the values. See `docs/operating-system/ui-verification.md`.

## Writing rules

- Prefer role-, label-, or placeholder-based locators over CSS/XPath tied to markup.
- Wait on expectations, never on fixed timeouts.
- One user journey per test; assert the behavior that journey exists to prove.
- Skip with an explicit reason when a precondition (credentials, seeded data, external service) is missing, instead of asserting something weaker.
- E2E specs complement real-browser evidence for UI changes; they do not replace it.

## Specs

| Spec | Journey | Tier |
|---|---|---|
| `{{e2e/example.spec.ts}}` | {{What the user does and what is asserted.}} | free / gated |
