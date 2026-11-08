# Engineering documentation

For the project overview, live application and local setup, start with the [root README](../README.md).

## Core engineering guides

- [Architecture and API boundaries](architecture.md) - frontend/API responsibilities, request flow and implemented scope.
- [Booking and scheduling](booking-and-scheduling.md) - availability, time zones, idempotency, transaction locks and participant conflicts.
- [Authentication and authorization](authentication-and-authorization.md) - Neon identity, JWT validation, resource ownership and hosted acceptance limits.
- [Database design and migrations](database.md) - data model, quote integrity, Alembic authority and migration safety.
- [Geographic discovery](location.md) - Google Places selection, independent Census identities, service areas and attribution.
- [Testing and reliability](testing.md) - reproducible checks, dated CI evidence, guarded PostgreSQL integration and release gates.

## Operations

- [Deployment and environment configuration](deployment.md) - service configuration, environment boundaries, schema release order and recovery.

## Technical deep dives

- [Booking detail and quote snapshots](booking-detail-snapshots.md) - immutable request pricing, legacy records and migration assumptions.
- [Registration continuity](registration-continuity.md) - encrypted signup receipts, verified identity and interrupted onboarding.
- [Geographic name normalization](geographic-name-normalization.md) - provenance-aware labels, ambiguity handling and stable IDs.
- [Census service-area importer](service-area-importer.md) - batched inserts, target verification and safe interruption/recovery.
- [Responsive design evidence](responsive-design-audit.md) - historical synthetic browser fixtures and retained artifacts; physical-device and hosted acceptance remain separate.
