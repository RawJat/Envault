# [1.4.0](https://github.com/DinanathDash/Envault/compare/v1.3.0...v1.4.0) (2026-02-04)


### Features

* Implement comprehensive Redis caching for permissions and introduce notification skeleton loaders. ([c2d156f](https://github.com/DinanathDash/Envault/commit/c2d156fb45609db6cae29702cad343cb7c8775de))
* Introduce a notification system with dedicated UI components, database schema, and dashboard integration, alongside database performance and security improvements. ([efe1bf4](https://github.com/DinanathDash/Envault/commit/efe1bf425c488cbc742dd0b0a8bc83098c8b1c4e))
* Refactor CLI `init` command for interactive project selection, improve device authentication window closing, and add new notification types. ([37b1ec5](https://github.com/DinanathDash/Envault/commit/37b1ec56d1cad914b1e3c5132815ecc984a67257))

# [1.3.0](https://github.com/DinanathDash/Envault/compare/v1.2.0...v1.3.0) (2026-02-03)


### Bug Fixes

* **db:** RLS recursion fixes and performance optimizations ([44d9634](https://github.com/DinanathDash/Envault/commit/44d963424527a985d0e1e0dc988a30131ee3aa79))


### Features

* Add Dependabot configuration for automated npm dependency updates in root and cli directories. ([8c5cad5](https://github.com/DinanathDash/Envault/commit/8c5cad5b1437c8c82337fd8ebaa97d85539197b5))
* **cli:** Update CLI project/secret routes and auth migration ([0a2e8ea](https://github.com/DinanathDash/Envault/commit/0a2e8eae6471bb68e1811369888b4f34ec4b2f90))
* **editor:** Enhance env var table, store, and project view ([ae4cb95](https://github.com/DinanathDash/Envault/commit/ae4cb95966d28b0be7aa61e3ecf5205f5813e1dd))
* **email:** Update email templates and handlers ([3343a07](https://github.com/DinanathDash/Envault/commit/3343a07dea846424417788f80841ba1d429b2b46))
* introduce a dedicated CLI section with interactive terminal visualization and update the developer features description. ([0ebce0a](https://github.com/DinanathDash/Envault/commit/0ebce0a796b933820ab074269c34c12933bde92a))
* **sharing:** Implement project/secret sharing, access requests, and join flow ([8a0407b](https://github.com/DinanathDash/Envault/commit/8a0407baac5714ae709a9fdb719051f3a133c02e))

# [1.2.0](https://github.com/DinanathDash/Envault/compare/v1.1.0...v1.2.0) (2026-02-02)


### Features

* Improve CLI login with clipboard support and user email display, enhance `.env` file detection for deploy, and add a `/api/cli/me` endpoint. ([f66aa4a](https://github.com/DinanathDash/Envault/commit/f66aa4a028242d4939fdedcd4165b2bba2a5e290))

# [1.1.0](https://github.com/DinanathDash/Envault/compare/v1.0.2...v1.1.0) (2026-02-01)


### Features

* Implement CLI device authentication, add new CLI API routes for projects and secrets, and enhance CLI commands with improved warnings. ([e4871c4](https://github.com/DinanathDash/Envault/commit/e4871c453d7e3974e94505e1f65014350a15a53a))

## [1.0.2](https://github.com/DinanathDash/Envault/compare/v1.0.1...v1.0.2) (2026-02-01)


### Bug Fixes

* sync version and verify automated release ([ab54ab2](https://github.com/DinanathDash/Envault/commit/ab54ab2b4a9ac045ea986d34d9187ab4c705c76e))

# 1.0.0 (2026-02-01)


### Bug Fixes

* **ci:** upgrade node to v22 for semantic-release ([fcdd294](https://github.com/DinanathDash/Envault/commit/fcdd29467dad11ddbe33190df04afd6ba03bfde0))


### Features

* Add comprehensive authentication flows including password reset, email confirmation, and update password with new UI components and email templates. ([c1da2ed](https://github.com/DinanathDash/Envault/commit/c1da2ed12a5669e76ad2d28d1c37564e55c3aeee))
* add landing page animations and update auth pages ([3c04f52](https://github.com/DinanathDash/Envault/commit/3c04f529ffa6dc2cf3e0bfdadb95fa5491a810f0))
* Add Open Graph and Twitter image metadata, including a new `open-graph.png` asset. ([3291026](https://github.com/DinanathDash/Envault/commit/3291026e2311b5d1f80016a769ba8c0fab2171d5))
* Add project governance documents, update README, and implement async secret decryption and user sign-out. ([380c88a](https://github.com/DinanathDash/Envault/commit/380c88accae92a7c0583c0bdd28963f55fc523f1))
* Add variable value visibility toggle, implement Tooltip component, and refine UI spacing and responsiveness. ([25fd618](https://github.com/DinanathDash/Envault/commit/25fd618f58977f8ef128105ac3d59466498c0637))
* document Upstash Redis integration and add rounded corners to favicon. ([7d68a5d](https://github.com/DinanathDash/Envault/commit/7d68a5d944b66547199268bfc5a93dc16fc0cfa6))
* Implement .env file download functionality and update application icons. ([81db44b](https://github.com/DinanathDash/Envault/commit/81db44b9094c21a5bbc314cd427b049fbdaff580))
* Implement amber theme for landing page and optimize session monitoring for public routes. ([e8634f2](https://github.com/DinanathDash/Envault/commit/e8634f2ac4d3e2561fc27c2d466ace91dcee0b00))
* implement CLI authentication and device flow ([85f794f](https://github.com/DinanathDash/Envault/commit/85f794feffa3256c1bb9f40fd37de28962fe045c))
* Implement core application structure with user authentication, project and environment variable management, and a comprehensive UI component library. ([1990916](https://github.com/DinanathDash/Envault/commit/1990916e90d2277b503c69363a4409e2c6d34db3))
* Implement key wrapping and rotation, add GitHub authentication, and enhance variable dialog with upsert logic and status indicators. ([a73783e](https://github.com/DinanathDash/Envault/commit/a73783ecedbd36d947fdd9b7ab39e7e38ea4edb1))
* Implement user authentication, project management, and bulk .env variable import with encryption. ([aa890cf](https://github.com/DinanathDash/Envault/commit/aa890cf9c4eee958648e5c82a8af4e0234cd5026))
* Introduce preloader component, global loading state, and skeleton UIs for dashboard and project views. ([3f052d6](https://github.com/DinanathDash/Envault/commit/3f052d6300133398505e43748a97e7aac2f29624))
* Refactor key rotation to use chunked processing and job management, integrate Upstash Redis for caching, and add Vercel Analytics. ([17ba173](https://github.com/DinanathDash/Envault/commit/17ba173e03c8f139f98069b6b04a0b77c9dea428))
