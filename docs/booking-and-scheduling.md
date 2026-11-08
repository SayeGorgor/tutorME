# Booking, scheduling and concurrency

The [booking service](../backend/app/services/bookings.py) controls eligibility, availability, quotes and transitions. [Session routes](../backend/app/routes/sessions.py) scope records/actions to participants. Frontend state cannot authorize appointments.

## Availability and time

Tutor-owned schedules use weekly Sunday=0 through Saturday=6 rows or explicit local dates, minute ranges and IANA zones. Appointments are one hour, on half-hour boundaries, in the future and within thirty days. A complete hour must fit one row; adjacent rows are not merged. DST gaps and ambiguous folds are rejected. Persist UTC instants and display them in the selected viewer zone.

Public slots exclude confirmed tutor overlaps across formats; authenticated submission/confirmation rechecks student conflicts. In-person support requires the tutor's format/service-area configuration but does not geofence the student, select a venue or add travel time.

## Requests and idempotency

Only eligible self-managed adult students request real appointments. Demo tutors, guardians/minor booking, active deletion review, missing current Terms and self-booking are rejected. Policy/booking gates are enforced server-side. Selected subjects/formats must be offered by the tutor.

A request includes a stable idempotency key, subject and expected rate. The expected rate acknowledges the displayed quote; the server reads the locked profile and saves its own Decimal amount. Stale rates return `QUOTE_CHANGED`; unavailable assignments return `SUBJECT_UNAVAILABLE`. Refresh/review before retrying. Extra price/total/currency/duration inputs do not become authority.

The per-student unique key and service comparisons return the original quote for identical retries. Changed tutor/mode/start/subject/rate conflicts. A new key for an existing pending student/tutor/start reuses the record only when format/subject/quote match; otherwise review/cancel. Eligibility/mode safety checks still apply to retries. Students have at most twenty future pending requests.

Pending is not a slot hold; several students can request one time. Expiry is derived at start time while the stored status stays pending. Expired requests do not count toward the cap. No fifteen-minute hold or expiry worker exists.

## Concurrency protocol

Submission/transitions lock participant User rows in ascending shared order, then TutorProfile, refreshing state after acquisition. Profile rate/subject edits and availability replacement share the profile lock. Subject capture uses a share lock. These boundaries serialize normal changes without reversing participant/profile lock order.

Intervals overlap when `existing.start < requested.end` and `existing.end > requested.start`. Confirmed overlaps for either tutor or student conflict across formats/tutors; back-to-back appointments are allowed. Confirmation rechecks eligibility/deletion, mode, current availability and conflicts while locks are held.

This guarantee requires PostgreSQL transactions and cooperating writers. It is not a database exclusion constraint against arbitrary SQL, and SQLite cannot demonstrate row locking. See [testing](testing.md).

## Transitions and privacy

Tutors confirm/decline future pending requests and complete ended confirmed appointments. Either participant cancels future pending/confirmed appointments. Same-transition retries return existing state. Outsiders do not receive booking records. Confirmation honors the original quote; tutors may decline rather than rewrite it.

Meeting details are participant-only while confirmed; cancellation clears them. Online URLs require HTTPS without embedded credentials; in-person details require public-venue confirmation. No automatic meetings, payments or email service is implied.

Cancel-then-request is not atomic rescheduling and may lose the original slot. Refresh for changes made in another browser. [Database](database.md) documents nullable legacy quotes; [authorization](authentication-and-authorization.md) covers identity and deletion.
