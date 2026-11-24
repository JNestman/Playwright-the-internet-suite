# The Internet – Playwright Test Automation Suite

[![Playwright Tests](https://github.com/JNestman/Playwright/actions/workflows/playwright.yml/badge.svg)](https://github.com/JNestman/Playwright/actions/workflows/playwright.yml)
![Playwright](https://img.shields.io/badge/Playwright-1.63-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-269-brightgreen)

An end-to-end test suite for [the-internet.herokuapp.com](https://the-internet.herokuapp.com/), a public practice site that collects ~80 of the trickiest UI patterns found in real web apps: auth flows, iframes, shadow DOM, WebSockets, file downloads, flaky APIs, and more.

**Every example page on the site is covered**, with tests written the way they would be on a product team: named after user-facing behaviour, organised by feature area, and built on reusable page objects and fixtures.

---

## Highlights

| | |
|---|---|
| **269 tests** | 233 on Chromium, plus an 18-test `@smoke` pack run on Firefox and WebKit |
| **Every page covered** | Full coverage of all example pages on the site, from Add/Remove Elements to WebSocket |
| **No hard-coded sleeps** | Waiting relies on Playwright's auto-waiting assertions and events |
| **Page Object Model** | Page objects for multi-step flows, injected into tests through custom fixtures |
| **Beyond clicking buttons** | Network mocking, WebSocket frame inspection, axe-core accessibility scans, visual diffs, console and CSP monitoring, multi-user testing |
| **CI ready** | GitHub Actions runs on every push and PR, plus a nightly run against the live site |

## What the suite shows

- **Authentication**: form login and logout, two-factor (OTP) login, HTTP Basic and Digest auth with `httpCredentials`, and protected routes
- **Forms**: HTML5 constraint validation alongside server-side errors, ARIA comboboxes driven by keyboard, debounced autocomplete, date pickers, and a 15-field form checked at the request-payload level
- **Async UI**: dynamic loading and controls, toasts, infinite scroll, a 10,000-row virtualised list, Server-Sent Events, and stale-element-proof locators
- **Network control**: `page.route()` mocks an API outage and blocks a slow third-party script; `waitForResponse` checks payloads; retry logic is tested against 429, 500 and 503 errors
- **Real time**: WebSocket frames inspected with `page.on('websocket')`, and a **two-user chat tested with two isolated browser contexts** at once
- **Frames and components**: nested framesets, sandboxed, `srcdoc` and shadow-DOM iframes, the TinyMCE editor, open and closed shadow roots, and a form-associated custom element
- **Files**: uploads through the file picker and a Dropzone, an upload-then-download round trip with a byte-for-byte check, Blob and data-URL downloads, and `Content-Disposition` edge cases (UTF-8 names, spaces)
- **Browser emulation**: geolocation, locale and time zone (de-DE, fr-FR, ja-JP, en-US), mobile viewport with touch, permissions, clipboard, and a fake camera
- **Quality gates**:
  - **Accessibility**: axe-core finds every issue the page documents, and the fixed version must come back clean.
  - **Visual regression**: catches a 10px shift, a colour change, a missing logo and a typo.
  - **Health checks**: broken images, JavaScript errors and a link check across the whole site.

## Tech stack

- [Playwright Test](https://playwright.dev/) 1.63 with TypeScript in strict mode
- [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) for accessibility scanning
- GitHub Actions for CI

## Project structure

```
.
├── fixtures/
│   └── test.ts                 # Custom `test` that injects page objects into every test
├── pages/                      # Page Object Model
│   ├── BasePage.ts             # Shared behaviour (navigation, flash messages)
│   ├── LoginPage.ts            # Login + Secure Area
│   ├── TwoFactorPage.ts
│   ├── SignupFormPage.ts
│   ├── DataTablesPage.ts       # Reads table cells by column header, not position
│   ├── ChatPage.ts
│   └── ...
├── test-data/
│   └── users.ts                # Test accounts (public demo credentials)
├── utils/
│   └── page-health.ts          # Broken-image detection, CSS pseudo-element reader
├── tests/
│   ├── authentication/         # Login, 2FA, Basic/Digest auth, forgot password
│   ├── forms/                  # Inputs, validation, custom dropdowns, date pickers
│   ├── dynamic-content/        # Async loading, changing content, SSE, slow APIs
│   ├── interactions/           # Hover, drag & drop, pointer gestures, canvas, SVG, dialogs
│   ├── frames-and-windows/     # Frames, iframes, new windows, shadow DOM
│   ├── files/                  # Upload & download
│   ├── browser-features/       # Geolocation, locale, responsive, cookies, permissions
│   ├── realtime/               # WebSocket echo, multi-user chat
│   ├── navigation/             # Home page, link health, redirects, status codes, SPA
│   ├── data/                   # Sortable tables, challenging & large DOMs
│   └── quality/                # Accessibility, console/network errors, visual regression
├── playwright.config.ts
└── .github/workflows/playwright.yml
```

### Coverage by area (Chromium)

| Area | Tests | Pages covered |
|---|---:|---|
| Forms | 49 | Inputs, Checkboxes, Radio Buttons, Dropdown, Multiple Select, Read-only Inputs, Horizontal Slider, Key Presses, Form Validation, Large Form, Custom Dropdown, Autocomplete, Date & Time Pickers |
| Interactions | 35 | Hovers, Context Menu, Drag and Drop, Pointer Events, Canvas, SVG, JavaScript Alerts, Native Dialog, Entry Ad, Exit Intent, JQuery UI Menus, Floating Menu |
| Dynamic content | 31 | Dynamic Loading, Dynamic Controls, Add/Remove Elements, Stale Element, A/B Testing, Disappearing Elements, Dynamic Content, Shifting Content, Typos, Notification Messages, Toasts, Infinite Scroll, Virtualized List, Live Updates, Slow & Failing API, Slow Resources |
| Browser features | 20 | Geolocation, Locale & Time Zone, Responsive Layout, Cookie Consent, Browser Permissions |
| Authentication | 18 | Form Authentication, Two-Factor Login, Basic Auth, Digest Authentication, Forgot Password |
| Navigation | 17 | Home, Redirect Link, Status Codes, Subdirectories, SPA Routing, plus a link check of every page |
| Quality | 17 | Accessibility Issues, Broken Images, JavaScript onload error, Network & Console, Visual Differences |
| Frames & windows | 14 | Frames, Nested Frames, iFrame / WYSIWYG Editor, Advanced Iframes, Multiple Windows, Shadow DOM, Advanced Shadow DOM |
| Files | 13 | File Upload, File Download, Secure File Download, Modern File Download |
| Data | 12 | Sortable Data Tables, Challenging DOM, Large & Deep DOM |
| Real time | 7 | WebSocket, Chat |

## Getting started

**Prerequisites:** Node.js 18 or later

```bash
git clone https://github.com/JNestman/Playwright.git
cd Playwright
npm ci
npx playwright install
```

### Running tests

```bash
npm test                    # Full suite (Chromium + Firefox/WebKit smoke)
npm run test:chromium       # Chromium only
npm run test:smoke          # @smoke tests on every browser
npm run test:cross-browser  # Firefox + WebKit
npm run test:headed         # Watch the browser while tests run
npm run test:ui             # Playwright UI mode (time-travel debugging)
npm run report              # Open the last HTML report
npm run typecheck           # TypeScript type-check
```

Run one area or one test:

```bash
npx playwright test tests/authentication
npx playwright test -g "two users in the same room"
```

When a test fails, the HTML report holds a **trace** (DOM snapshots, network and console for each step), a screenshot and a video.

## Design decisions

- **Tests describe behaviour, not implementation.** Names read like acceptance criteria, for example *"wrong one-time code is rejected"* or *"client retries transient failures and eventually succeeds"*.
- **Page objects where they add value.** Multi-step flows (login, 2FA, sign-up, tables, chat) have page objects. Single-interaction pages use locators inline, so there's no wrapper layer that doesn't pay for itself.
- **User-facing locators first.** The order of preference is `getByRole`, then `getByLabel`, then `getByText`, then CSS ids. That keeps tests close to what a user (and a screen reader) sees.
- **Assert what must stay true, tolerate what may change.** Pages that are random on purpose (A/B test, typos, disappearing elements) are checked against the set of allowed states rather than one snapshot.
- **No test leaks into another.** Every test gets a fresh browser context. Chat tests use randomly named rooms, and uploads use unique file names, so parallel runs never collide.
- **No fixture files on disk.** Upload payloads are made in memory with `Buffer.from(...)`.
- **Visual checks without OS-specific baselines.** Baseline images taken on Windows would fail on a Linux CI runner. Each visual test captures the baseline and the variant in the same run and compares them pixel for pixel.
- **Be kind to the shared demo server.** Worker count is modest, and checks that only need HTTP use the `request` fixture instead of a full browser.

## Known issues found by the suite

The suite reports real browser and page quirks instead of hiding them:

| Finding | How it's handled |
|---|---|
| WebKit returns empty `text/html` from `dataTransfer.getData()` during synthetic HTML5 drags | `test.fixme` on WebKit only, with the reason recorded in the report |
| `/typos` randomly ships a typo (`won,t`) | Passes for either known version, and adds a `content-defect` annotation to the report when the typo appears |
| `/dynamic_content` reuses `id="content"` for two elements | Locators are scoped through `.example` instead |
| `color-contrast` comes back from axe as *needs review* rather than a definite violation | The accessibility test counts both lists |

## Built with AI pair programming

This suite was built together with **Claude Code** (Anthropic's AI coding agent), with me directing the work and reviewing the output. The workflow:

1. **Recon:** the agent downloaded every example page and read its HTML and JavaScript to learn the real behaviour (timers, ARIA attributes, server responses) instead of guessing selectors.
2. **Design:** it proposed the folder layout, fixtures and page-object boundaries.
3. **Write, run, triage:** it wrote tests one area at a time, ran them, and looked into each failure to decide whether it was a test bug or a real quirk. Examples:
   - the headless shell browser has no media stack, so the camera test runs on full Chromium;
   - Playwright honours `aria-disabled`, so the test forces the click to show the widget also ignores it;
   - a native `alert()` blocks the right-click that opens it, so the dialog handler has to be registered before clicking.
4. **Stability:** the whole suite was repeated on every browser to check for flaky tests before it was committed.

Knowing when to trust the AI's output, and checking it by running the tests rather than reading the code, was as much a part of the work as the Playwright skills themselves.

## License

ISC
