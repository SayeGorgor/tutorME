BEGIN;

-- Running upgrade c21a76e9d304 -> e47b901ad682

ALTER TABLE users ADD COLUMN account_purpose VARCHAR(20);

ALTER TABLE users ADD COLUMN adult_attested_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ADD COLUMN terms_version VARCHAR(80);

ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tutor_profiles ADD COLUMN is_demo BOOLEAN DEFAULT false NOT NULL;

CREATE TABLE bookings (
    id VARCHAR(36) NOT NULL, 
    student_id BIGINT NOT NULL, 
    tutor_id BIGINT NOT NULL, 
    mode VARCHAR(12) NOT NULL, 
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    status VARCHAR(12) DEFAULT 'pending' NOT NULL, 
    idempotency_key VARCHAR(80) NOT NULL, 
    meeting_details TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT booking_positive_duration CHECK (ends_at > starts_at), 
    CONSTRAINT booking_mode CHECK (mode IN ('online', 'in-person')), 
    CONSTRAINT booking_status CHECK (status IN ('pending','confirmed','declined','cancelled','completed')), 
    CONSTRAINT uq_booking_request UNIQUE (student_id, idempotency_key), 
    FOREIGN KEY(student_id) REFERENCES users (id) ON DELETE RESTRICT, 
    FOREIGN KEY(tutor_id) REFERENCES tutor_profiles (id) ON DELETE RESTRICT
);

CREATE INDEX ix_bookings_tutor_time ON bookings (tutor_id, starts_at, ends_at);

CREATE INDEX ix_bookings_student_time ON bookings (student_id, starts_at, ends_at);

CREATE TABLE deletion_requests (
    user_id BIGINT NOT NULL, 
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, 
    PRIMARY KEY (user_id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE RESTRICT
);

UPDATE alembic_version SET version_num='e47b901ad682' WHERE alembic_version.version_num = 'c21a76e9d304';

COMMIT;

