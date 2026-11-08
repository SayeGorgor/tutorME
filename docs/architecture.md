# Architecture and API boundaries

The [Next.js frontend](../frontend/) owns presentation, managed-auth sessions and browser interaction. The [FastAPI application](../backend/app/main.py) exposes domain APIs under `/api`; [SQLAlchemy models](../backend/app/models/) map application data to PostgreSQL and [Alembic](../backend/alembic/) versions the schema. Independent frontend/API deployments require compatible API/schema versions and matching Auth origins.

## Request flow

Public discovery filters tutors by subject, price, format and optional service area. A Google-selected city/ZIP resolves to an independent area ID. Authenticated requests carry a provider JWT; backend dependencies validate identity and load the application user. Route authorization and services decide who may modify profiles, availability and bookings. Frontend route gating improves navigation but cannot authorize API operations.

The [route registry](../backend/app/routes/api.py) groups users, tutors, bookings, subjects, locations, policies and health. Pydantic schemas separate validated input, public tutor/search responses and participant-only booking details. Services centralize registration, scheduling, deletion states, geographic matching and policy gates. Database sessions are request-scoped and closed after use.

## State boundaries

- Hosted Neon Auth owns sign-in identities/sessions. Unique `users.auth_id` links application records to provider subjects without duplicating passwords.
- Tutor profiles, subject associations and recurring/custom availability describe offerings, not guaranteed confirmed appointments.
- Bookings retain immutable subject/quote snapshots. Confirmation serializes participant conflicts; see [scheduling](booking-and-scheduling.md).
- Independent Census service areas support resolution/radius calculations. Google controls its widget/attribution; see [location](location.md).
- Policy readiness and booking configuration govern registration/real booking. Guardian accounts do not enable child-profile collection or minor bookings.
- Deletion requests are operator-reviewed records, not automatic account deletion; active/unknown states block new booking activity while history remains.

## Implemented scope

Appointment quotes are fixed one-hour USD amounts for direct participant arrangements. There is no payment collection, booking-email service, automatic meeting provider, calendar sync or atomic rescheduling. Pending requests do not reserve slots. Visible UI/source defaults do not establish live deployment readiness.

[Local setup](../README.md#running-locally), [database](database.md), [authorization](authentication-and-authorization.md), [deployment](deployment.md) and [testing](testing.md) describe guarantees and their practical limits.
