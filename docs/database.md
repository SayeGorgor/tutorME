# Database design and Alembic migrations

PostgreSQL stores application data through [SQLAlchemy models](../backend/app/models/). Managed Auth identity storage is separate. Public tutor responses must omit private identity/email/eligibility fields.

| Model | Responsibility |
| --- | --- |
| User | Provider subject, authoritative email/name, role, zone and eligibility/Terms acknowledgments |
| TutorProfile / tutor_subjects | Owned offering, hourly rate, assigned subjects, format and service area |
| TutorAvailability | Weekly day or explicit date, local minute range and IANA zone |
| ServiceArea | Independent geographic identity, provenance and representative coordinates |
| Booking | Participants, UTC interval, mode/status, idempotency key, private meeting details and quote |
| DeletionRequest | Retained account request/status; operator processing is separate |

Participant foreign keys preserve booking history with restrictive deletion semantics. Tutor/student time indexes support overlap queries. There is no database exclusion constraint against arbitrary privileged SQL overlaps; [scheduling](booking-and-scheduling.md) explains application locking.

## Quote snapshots

Six nullable fields capture subject ID/name, hourly rate, currency, duration and session amount. Money uses `Numeric(12,2)` and Decimal; API decimals serialize as strings. Current quotes are USD, 60 minutes and amount equal to hourly rate. Check constraints enforce nonnegative money and the fixed-hour model when values are present.

Historical subject IDs deliberately have no live foreign key: catalog edits/deletion must not erase request identity or break identical retries. Normal application transitions never recalculate saved quotes. There is no quote-update endpoint or immutability trigger; privileged SQL is outside the guarantee.

Legacy fields stay NULL with no inferred backfill/defaults; show **Not recorded** instead of today's prices. Profile Float pricing remains for compatibility; capture validates exact cents from decimal text without silently rounding invalid rates.

## Migration authority

[backend/alembic/versions](../backend/alembic/versions/) is authoritative. Inspected source has one terminal revision, `f83d2a19b506`, following `e47b901ad682` (account safety/bookings) and `c21a76e9d304` (locations). The quote migration is additive and refuses automatic downgrade pending export/review. This is source topology, not a claim about a live database revision.

Older generated DDL snapshots duplicate earlier location/account-booking upgrade steps, predate quote fields and are not idempotent. They are not an alternative migration system. Use the authoritative migration directory linked above; never replay snapshots or stamp a mismatched schema. Private copies preserve the old SQL for reference; duplicate current-tree snapshots have been retired. Preserve every original backend migration.

Privately confirm actual target/revision, review/test DDL on a disposable environment and migrate before code expecting new fields. Keep recoverable backups. ORM `create_all` tests do not validate historical Alembic conversions. See [deployment](deployment.md) and [testing](testing.md).
