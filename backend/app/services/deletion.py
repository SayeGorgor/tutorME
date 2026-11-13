"""Lifecycle for existing string statuses; no migration or record conversion."""

from app.models.booking import DeletionRequest

ACTIVE_DELETION_STATES = frozenset({"pending", "under_review"})
CLOSED_DELETION_STATES = frozenset({"rejected", "processed", "completed"})


def deletion_is_active(status):
    # Unknown legacy states require manual review instead of silently reopening access.
    return status not in CLOSED_DELETION_STATES


def account_has_active_deletion(db, user_id):
    request = db.get(DeletionRequest, user_id)

    return request is not None and deletion_is_active(request.status)
