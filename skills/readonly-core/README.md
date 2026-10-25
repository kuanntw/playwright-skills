# Shared readonly core

Import `test` from `fixtures/readOnlyFixture.ts` for every readonly spec. Its automatic collector records attempted violations and fails teardown; context routing aborts non-GET/HEAD requests before delivery, while APIRequestContext is guarded separately.

Service Workers and page/frame WebSockets are blocked. The fixture owns safe teardown. Do not replace routes, create independent contexts, or use raw networking. GET/HEAD may mutate state and worker sockets are not covered: see the root README's enforcement boundaries before using this template.
