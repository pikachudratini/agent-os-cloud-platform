# Standing QA Loop

This QA loop is mandatory for every ledger task. A task is not done until code, tests, relevant QA checks, and ledger evidence all exist.

## Automated Tests

- Unit tests for business logic.
- Integration tests for auth and tenant isolation.
- A tenant isolation test that proves tenant A cannot read tenant B's data is mandatory and blocking before Phase 1 is declared complete.
- End-to-end tests for signup, onboarding conversation, and agent provisioning once those surfaces exist.

## Responsive Checks

Every user-facing page must be checked at 375px, 768px, and 1440px. Manual checks: tap targets at least 44px, no horizontal scroll, keyboard does not cover active inputs on mobile, and main flows work in Chrome, Safari, Firefox desktop, iOS Safari, and Android Chrome before release.

## Security Checklist

Dependency audit, secrets scan, authz test on every API route, rate limiting on public endpoints, input validation on all user-supplied content, webhook signature verification, and audit log writes on every mutation and outbound communication.

## Agent-Specific QA

The onboarding agent must be tested against at least 10 scripted personas. Store transcripts in `docs/qa-transcripts/`. Minimum personas: confused non-technical user, almost-no-information user, prompt-injection user, busy small-business owner, multiple service lines, no documents, website-only knowledge source, strict tone preferences, outbound-email request before approval mode, and regulated-data request.

## CI Requirements

CI must run lint, unit tests, and build on every push and pull request. Responsive and end-to-end checks become blocking as soon as user-facing pages exist.

## Evidence Format

Each ledger task evidence entry must include command run, result or output summary, date, screenshot or Playwright report path for UI work, or exact blocker if blocked.

## Tooling Implemented In This Scaffold

- `npm run lint` validates required repository docs and package metadata.
- `npm test` validates `docs/LEDGER.md` contains required task fields and acceptance criteria.
- GitHub Actions workflow runs install, lint, test, and build.
- Playwright configuration is stubbed for future viewport testing, based on official Playwright configuration docs: https://playwright.dev/docs/test-configuration
