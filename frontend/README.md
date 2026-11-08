# tutorME

**Find the right tutor, online or nearby.**

[**Live demo**](https://tutorme2.vercel.app/) · [**Source code**](https://github.com/SayeGorgor/tutorME)

tutorME is a full-stack tutoring marketplace that helps students discover tutors and coordinate sessions. It brings together subject- and location-based discovery, tutor profiles, availability management, and protected student/tutor workflows in one application.

## Core Features

- **Tutor discovery:** search by subject and location, with options for online and in-person sessions.
- **Detailed tutor profiles:** review tutoring information, subjects, rates, and available session options.
- **Student and tutor accounts:** distinct, authenticated workspaces with role-aware access.
- **Flexible availability:** recurring weekly hours alongside date-specific availability and exceptions.
- **Booking workflows:** requests and confirmation logic that account for scheduling conflicts across online and in-person sessions.
- **Persistent scheduling:** availability and booking data stored through a Python API backed by PostgreSQL.
- **Responsive experience:** interfaces designed for desktop and mobile browsing.

> **Development status:** tutorME is an actively developed marketplace. Some booking and legal/compliance-related features are configuration-gated; a live deployment or visible interface does not by itself indicate that all bookings are enabled for public use.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS 4 |
| Backend | Python, FastAPI, Pydantic |
| Database | PostgreSQL (Neon), SQLAlchemy, Alembic |
| Authentication | Neon Auth, authenticated API requests |
| Deployment | Vercel (frontend), Railway (backend) |

## How It Works

1. **Discover:** a student searches for a subject, location, and session format.
2. **Compare:** the student reviews tutor profiles and availability.
3. **Coordinate:** an authenticated booking workflow submits or manages a requested time.
4. **Prevent conflicts:** backend rules and database-backed checks help prevent overlapping confirmed sessions.

## Engineering Highlights

**Separated frontend and backend.** The React/Next.js UI communicates with a dedicated FastAPI service. This keeps presentation, request validation, scheduling rules, and data access organized into distinct layers.

**Real-world scheduling constraints.** The availability model supports repeated weekly windows and date-specific time ranges. Booking logic includes conflict handling that considers a tutor's calendar across both online and in-person sessions.

**Authentication and authorization.** Neon Auth provides identity, while backend endpoints enforce application-specific access to student and tutor resources.

**Database migrations and tests.** SQLAlchemy manages persistent models and Alembic manages schema migrations. The repository includes backend tests, including explicitly opted-in PostgreSQL concurrency tests for booking conflicts; those tests require an approved disposable test database.

## Repository Structure

```text
tutorME/
├── frontend/           # Next.js client, pages and UI components
├── backend/
│   ├── app/            # FastAPI routes, models, schemas and services
│   ├── tests/          # Backend tests
│   ├── alembic.ini     # Migration configuration
│   └── requirements.txt
└── docs/               # Project documentation
```

## Status and Scope

This project is under active development. Features exposed in the UI, behind feature flags, or in the source code may have different production readiness; consult current deployment configuration before using it for real tutoring arrangements.

**Built by [Saye Gorgor](https://github.com/SayeGorgor).**


## Technical documentation

See [engineering documentation](../docs/README.md) for architecture, migrations, scheduling/concurrency, authorization, location, deployment and testing boundaries.
