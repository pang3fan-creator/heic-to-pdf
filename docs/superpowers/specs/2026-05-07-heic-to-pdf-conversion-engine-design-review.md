# HEIC to PDF Conversion Engine Design Review

## Review Scope

Reviewed file:

- `docs/superpowers/specs/2026-05-07-heic-to-pdf-conversion-engine-design.md`

Review date:

- 2026-05-07

Review goal:

- Assess whether the plan is technically sound and ready for implementation in the current repository.
- Focus on architecture risk, implementation gaps, repo alignment, i18n/testing completeness, and likely browser/runtime pitfalls.

## Findings

### 1. Preview design is underspecified and likely underestimates complexity

Severity: High

The plan defines a `PreviewDialog` that shows a PDF first-page thumbnail and page navigation, but the technical design does not include any rendering strategy for PDF preview.

Relevant plan sections:

- `PreviewDialog` UI design
- `pdf-generator.ts` only covers PDF generation

Why this is risky:

- `pdf-lib` can generate PDFs, but it does not render them for preview.
- The current plan does not specify whether preview uses:
  - browser-native PDF embedding (`iframe`, `object`, new tab), or
  - a renderer like `pdf.js`, or
  - custom-generated preview images.
- Without this decision, the front-end scope is materially underestimated.

Recommendation:

- Split preview into phases.
- Phase 1: support conversion + download + optional browser-native PDF open/view.
- Phase 2: only add in-app thumbnail/page preview if a concrete rendering approach is chosen.

### 2. Memory assumptions are too optimistic

Severity: High

The plan says memory is controlled because decoding is serial and only the current image is kept in memory, but the described flow also collects PNG bytes for all images before PDF assembly.

Relevant plan sections:

- serial decode / memory statement
- collect PNG bytes before PDF generation

Why this is risky:

- Peak memory may include:
  - current RGBA buffer
  - current PNG blob/bytes
  - previously collected PNG bytes
  - `pdf-lib` internal structures
  - final PDF blob
- This is especially risky with 20 large HEIC files and on Safari or lower-memory devices.

Recommendation:

- Update the plan with a realistic memory model.
- Prefer a design that releases intermediate buffers aggressively.
- Add explicit test scenarios for:
  - 10-20 large photos
  - Safari
  - mobile-class memory pressure

### 3. `Original` page-size mode is not precisely defined

Severity: High

The plan says `Original` mode renders each image at its original size, but PDF pages are measured in points, not raw image pixels.

Relevant plan sections:

- `ConversionSettings`
- `Original`: "按原始尺寸渲染"

Why this is risky:

- Without a pixel-to-page-unit rule, output can become inconsistent or unexpectedly huge.
- Different images could produce wildly different page sizes.
- This is the sort of ambiguity that causes implementation churn and QA disagreement later.

Recommendation:

- Define an explicit mapping rule, for example:
  - pixels mapped at fixed DPI, or
  - original aspect ratio preserved within bounded page dimensions.
- Add concrete examples into the plan.

### 4. HEIC orientation / metadata handling is missing

Severity: High

The plan describes HEIC decode to RGBA and then PNG/PDF generation, but it does not specify how image orientation metadata is applied.

Why this is risky:

- Many iPhone HEIC photos rely on metadata for correct display orientation.
- If orientation is ignored, some converted images will appear rotated incorrectly.
- This is a highly visible user-facing defect.

Recommendation:

- Add explicit orientation handling requirements to the worker or conversion pipeline.
- Include at least one portrait iPhone sample and one landscape sample in verification.

### 5. Worker message protocol is not fully aligned with efficient transfer semantics

Severity: Medium-High

The plan says RGBA data is transferred back to the main thread using transfer semantics, but the message type is defined as `ImageData`.

Why this is risky:

- The plan currently mixes conceptual zero-copy transfer with a higher-level object shape.
- Large image payloads need a precise contract to avoid accidental structured cloning overhead.

Recommendation:

- Define the payload explicitly as width/height plus a transferable `ArrayBuffer`.
- Document which objects are transferred and when buffers are released.

### 6. The plan assumes testing and i18n maturity that the current repo does not have

Severity: Medium-High

The project notes mention multi-language support and an established test workflow, but the current repo state does not match that assumption.

Current repo observations:

- `messages/en.json` exists, but no parallel `es/fr/...` message files are present.
- `src/i18n/routing.ts` currently only defines `en`.
- `package.json` does not define a `test` script and does not include Vitest or Jest dependencies.

Why this is risky:

- The plan is framed like implementation can start directly on the conversion engine.
- In practice, test infrastructure and localization expansion may become hidden scope added during implementation.

Recommendation:

- Update the plan to include prerequisite work:
  - introduce test runner and test scripts
  - define worker/mock test strategy
  - define new translation keys and language rollout expectations

### 7. New UI copy and localization work are not called out

Severity: Medium

The plan introduces multiple new UI states and strings, including settings labels, error messages, preview actions, and summary text, but it does not list translation work.

Why this is risky:

- This project already uses `next-intl`.
- New text added without message planning tends to produce hardcoded strings or delayed localization cleanup.

Recommendation:

- Add a section listing required message namespaces/keys.
- If the product is staying English-only for now, say that explicitly in the plan instead of silently assuming future localization.

### 8. Component integration point may not match the current client/server boundary cleanly

Severity: Medium

The plan says `src/app/[locale]/page.tsx` will integrate `PreviewDialog`, but the current interactive state already lives in client components under `HeroSection` and `DropZone`.

Why this is risky:

- Pushing preview orchestration up into the page layer could complicate server/client boundaries.
- The current architecture suggests a dedicated client container would be a cleaner home for conversion state, settings, and preview.

Recommendation:

- Introduce a client-side orchestration component for:
  - file selection
  - settings
  - conversion lifecycle
  - preview/download state
- Keep the page itself mostly compositional.

### 9. Next.js / Worker / WASM integration is presented as settled, but needs a proof-of-concept

Severity: Medium

The plan directly specifies `asyncWebAssembly: true` and worker creation strategy, but this should be validated against the current Next.js version and actual bundler behavior before the main implementation plan treats it as solved.

Why this is risky:

- Build/runtime details around Worker + WASM packaging can be version-sensitive.
- A failed assumption here can block the whole implementation late.

Recommendation:

- Add a pre-implementation spike/POC step:
  - confirm worker bundling works in local dev and production build
  - confirm WASM asset loading path
  - confirm browser runtime behavior

### 10. Cancellation and resource cleanup details are missing

Severity: Medium

The state machine handles success, partial failure, and full failure, but not cancellation or resource disposal.

Why this is risky:

- Browser-side long-running tasks need careful cleanup.
- Missing cleanup can cause:
  - leaking object URLs
  - zombie workers
  - stale state when users reselect files quickly

Recommendation:

- Add explicit handling for:
  - cancel during conversion
  - `worker.terminate()`
  - revoking object URLs
  - resetting previous result state before a new run

## Open Questions

1. Is in-app PDF preview a hard requirement, or can phase 1 use browser-native viewing/downloading only?
2. What is the intended output rule for `Original` mode in PDF page units?
3. What browsers must be fully supported for launch?
4. Is the product currently English-only in practice, or should this plan already model multi-language rollout?

## Recommended Plan Adjustments

Before implementation begins, the plan should be revised to add:

1. A small technical POC phase for Worker + WASM + Next.js integration.
2. A simplified phase-1 preview strategy.
3. Explicit image orientation handling.
4. Realistic memory-risk notes and verification cases.
5. Test setup and worker testing strategy.
6. i18n message planning for all new UI and error states.
7. Cleanup/cancellation behavior in the state machine.

## Conclusion

The plan is directionally solid, but it is not yet implementation-ready.

The biggest issue is not the overall architecture choice. It is that several high-risk parts are described as if they are straightforward, when they still need sharper product decisions or technical validation:

- PDF preview
- memory behavior
- HEIC orientation correctness
- actual Next.js Worker/WASM integration path

After those are tightened up, this can become a much stronger execution plan.
