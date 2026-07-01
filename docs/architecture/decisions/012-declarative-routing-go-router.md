# ADR 012: Declarative Routing with go_router

**Status:** Accepted  
**Date:** April 2026  
**Supersedes:** ADR-004 (Imperative Navigation with Programmatic Guards)

---

## Context

ADR-004 adopted Flutter's imperative `Navigator` API with per-route guard helpers and `Navigator.pushNamed()`. As the application grew into a web-first admin platform — with deep links, role-based areas, nested entity routes, and an Auth0 redirect flow — the imperative approach showed friction:

- **Web URLs and deep linking.** Imperative navigation does not map cleanly to real browser URLs, back/forward history, or refresh-on-a-deep-link. The admin app is deployed to the web, where shareable, bookmarkable URLs matter.
- **Scattered access control.** Guards were applied per route at build time, so the rules deciding "who can see what" were spread across route builders and easy to apply inconsistently.
- **Auth-state reactivity.** Redirecting on login/logout required imperative replace-navigation inside post-frame callbacks, which is awkward and error-prone.
- **Nested and dynamic routes.** Entity and system screens need a hierarchical route structure with collision handling that is cumbersome to express as a flat route map.

## Decision

**Adopt `go_router` as the application's declarative router, with a single centralized route guard driving all access-control redirects.**

Key design points (implementation lives in `lib/core/routing/`):

- **Declarative route tree.** Routes are declared as a `GoRoute` hierarchy in `app_router.dart`; path constants live in `app_routes.dart`. Nested routes model parent/child screens (e.g. admin and its entity and system sub-routes), with system routes ordered ahead of the dynamic `:entity` segment to avoid collisions.
- **Centralized guard.** A single `RouteGuard` (`route_guard.dart`) is the source of truth for access control. It is invoked from go_router's global `redirect`, classifying each route as public, authentication-required, or admin-required and returning the redirect target when access is denied. Security redirects are kept distinct from convenience/UX redirects (such as sending an already-authenticated user away from the login page).
- **Auth-reactive.** The router is supplied with `refreshListenable: authProvider`, so navigation re-evaluates automatically when authentication state changes — no imperative push from build callbacks.
- **Web-grade URLs and deep linking.** go_router provides clean URL parsing, browser history, and deep-link support that the web deployment depends on.
- **Auth0 flow.** A dedicated callback route handles the Auth0 redirect and integrates with the auth provider before routing onward.

Navigation is performed through go_router (see the navigation coordinator) rather than ad-hoc `Navigator.pushNamed()` calls; the imperative route-map model from ADR-004 is retired.

## Consequences

**Positive**

- Access control is defined in one place (`RouteGuard`), making the security posture consistent and auditable.
- Real, shareable web URLs with working back/forward navigation and deep links.
- Auth-driven redirects are declarative and reactive instead of imperative and frame-timed.
- A hierarchical route tree expresses the admin / entity / system structure naturally.

**Trade-offs**

- A routing-library dependency (`go_router`) and its upgrade cadence to manage.
- Declarative redirect logic is powerful but must be reasoned about holistically — the order and precedence of redirects matter.
- Contributors must follow the centralized-guard pattern rather than adding ad-hoc per-screen checks.

## Notes

This ADR formalizes a decision already realized in the codebase. The canonical route definitions and guard rules live in `lib/core/routing/` and are the source of truth for current behavior.
