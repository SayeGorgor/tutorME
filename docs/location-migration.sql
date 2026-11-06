BEGIN;

-- Running upgrade 81099c270fbc -> c21a76e9d304

CREATE TABLE service_areas (
    id VARCHAR(80) NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    region VARCHAR(80) NOT NULL, 
    country VARCHAR(2) NOT NULL, 
    postal_code VARCHAR(20), 
    latitude FLOAT NOT NULL, 
    longitude FLOAT NOT NULL, 
    source VARCHAR(100) NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT service_area_coordinates CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

CREATE INDEX ix_service_areas_name ON service_areas (name);

CREATE INDEX ix_service_areas_postal_code ON service_areas (postal_code);

CREATE INDEX ix_service_areas_latitude ON service_areas (latitude);

ALTER TABLE tutor_profiles ADD COLUMN online_enabled BOOLEAN DEFAULT true NOT NULL;

ALTER TABLE tutor_profiles ADD COLUMN in_person_enabled BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE tutor_profiles ADD COLUMN service_area_id VARCHAR(80);

ALTER TABLE tutor_profiles ADD COLUMN place_id VARCHAR(255);

ALTER TABLE tutor_profiles ADD COLUMN travel_radius_miles FLOAT DEFAULT '25' NOT NULL;

ALTER TABLE tutor_profiles ADD COLUMN meeting_preferences VARCHAR(500);

ALTER TABLE tutor_profiles ADD CONSTRAINT fk_tutor_service_area FOREIGN KEY(service_area_id) REFERENCES service_areas (id);

CREATE INDEX ix_tutor_profiles_service_area_id ON tutor_profiles (service_area_id);

ALTER TABLE tutor_profiles ADD CONSTRAINT tutor_at_least_one_mode CHECK (online_enabled OR in_person_enabled);

ALTER TABLE tutor_profiles ADD CONSTRAINT tutor_in_person_area CHECK (NOT in_person_enabled OR service_area_id IS NOT NULL);

ALTER TABLE tutor_profiles ADD CONSTRAINT tutor_travel_radius CHECK (travel_radius_miles BETWEEN 0 AND 100);

CREATE TABLE tutor_subjects (
    tutor_id BIGINT NOT NULL, 
    subject_id BIGINT NOT NULL, 
    PRIMARY KEY (tutor_id, subject_id), 
    FOREIGN KEY(tutor_id) REFERENCES tutor_profiles (id) ON DELETE CASCADE, 
    FOREIGN KEY(subject_id) REFERENCES subjects (id) ON DELETE CASCADE
);

UPDATE alembic_version SET version_num='c21a76e9d304' WHERE alembic_version.version_num = '81099c270fbc';

COMMIT;

