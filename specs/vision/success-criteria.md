---
type: Vision
---

# Success Criteria

> Measurable targets. When all are met, the project has achieved its goals.

## Phase 0 Targets
| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| Empty vault round-trip | User signs up, logs in, saves empty encrypted vault, server persists ciphertext, user reloads and decrypts to same empty vault | Smoke test in `tests/smoke/phase-0-roundtrip.test.ts` passes |
| Server never sees master password or vault key | Verify that only the auth hash and ciphertext are transmitted/stored; plaintext master password never leaves the browser | Unit test asserting request payloads + storage schema invariants |
| KDF cost target met | Argon2id runs in a measurable wall-time band appropriate for interactive login | Test logs KDF wall time; benchmark assertion bounds it |
| CI green | Lint, typecheck, and tests pass on every push | CI status badge green on Phase 0 branch |

## Long-Term Targets
| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| Zero server-side plaintext exposure | Server stores only ciphertext + auth hash for every persisted secret | Static assertions + storage layer tests cover all server write paths |
| User retries passwords < N per week | Core retrieval friction is low; entry search/generator obviate manual lookup | Usage metric (instrumented counter) once MVP is in use — refine target post-MVP |
| Recovery works end-to-end | Lost-master-password recovery via recovery code restores vault access | Recovery test in phase corresponding to M8 |
| Cross-device sync verified | Same credentials on a second device decrypt the same vault | Integration test in sync phase |