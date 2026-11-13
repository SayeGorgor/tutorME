"""Seed a varied, clearly fictional TutorME tutor roster.

Save at backend/scripts/seed_demo_tutors.py. From backend/:
    python -m scripts.seed_demo_tutors --expected-project-id ... \
      --expected-branch-id ... --expected-database neondb

Preview mode (default) reads only. Add --apply to create the records.
Never creates Auth-provider accounts or genuine bookable tutors.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from collections import Counter

from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.service_area import ServiceArea
from app.models.subject import Subject
from app.models.tutor_availability import AvailabilityType, TutorAvailability
from app.models.tutor_profile import TutorProfile
from app.models.user import User, UserRole
from app.services.geographic_names import geographic_display_name, name_key
from scripts.seed import seed_subjects

NAMESPACE = "demo:seed-v2:"
EMAIL_DOMAIN = "example.invalid"  # Reserved, non-deliverable; not a Neon Auth login.


@dataclass(frozen=True)
class TutorSpec:
    slug: str
    first: str
    last: str
    mode: str  # online, in-person, both
    city: str | None
    state: str | None
    price: int
    subjects: tuple[str, ...]
    focus: str
    approach: str
    timezone: str = "America/New_York"


# Every subject comes from the project's canonical scripts.seed subject catalog.
# Locations are resolved to EXISTING 2025 Census place records, not invented IDs.
ROSTER: tuple[TutorSpec, ...] = (
    TutorSpec(
        "algebra-jordan",
        "Jordan",
        "Parker",
        "online",
        None,
        None,
        30,
        ("Algebra",),
        "Building confidence with algebra",
        "short explanations and guided practice",
    ),
    TutorSpec(
        "sat-taylor",
        "Taylor",
        "Morgan",
        "both",
        "Atlanta",
        "GA",
        48,
        ("SAT Math", "SAT English", "SAT Full Prep"),
        "Structured SAT preparation",
        "goal-setting and timed practice",
    ),
    TutorSpec(
        "geometry-avery",
        "Avery",
        "Mitchell",
        "in-person",
        "Marietta",
        "GA",
        36,
        ("Geometry", "Algebra"),
        "Making math visual and approachable",
        "diagrams and worked examples",
    ),
    TutorSpec(
        "writing-casey",
        "Casey",
        "Bennett",
        "both",
        "Decatur",
        "GA",
        38,
        ("Grammar", "US Literature", "SAT English", "ACT Reading"),
        "Clearer reading and writing",
        "outlining, discussion, and feedback",
    ),
    TutorSpec(
        "programming-riley",
        "Riley",
        "Cooper",
        "online",
        None,
        None,
        55,
        ("Python", "JavaScript", "HTML", "CSS", "SQL"),
        "Learning to code through projects",
        "small coding exercises and debugging",
    ),
    TutorSpec(
        "physics-cameron",
        "Cameron",
        "Reed",
        "in-person",
        "Sandy Springs",
        "GA",
        50,
        ("Physics",),
        "Breaking down challenging physics ideas",
        "real-world examples and step-by-step problem solving",
    ),
    TutorSpec(
        "science-morgan",
        "Morgan",
        "Ellis",
        "both",
        "Roswell",
        "GA",
        42,
        ("Chemistry", "Biology"),
        "Practical science study support",
        "concept maps and retrieval practice",
    ),
    TutorSpec(
        "calculus-quinn",
        "Quinn",
        "Foster",
        "in-person",
        "Alpharetta",
        "GA",
        60,
        ("Calculus", "Trigonometry", "Algebra", "Geometry", "Statistics"),
        "Support for advanced math courses",
        "breaking complex problems into smaller steps",
    ),
    TutorSpec(
        "history-jamie",
        "Jamie",
        "Brooks",
        "both",
        "Smyrna",
        "GA",
        33,
        ("US History", "World History", "Geography"),
        "History that connects ideas",
        "timelines, discussion, and review questions",
    ),
    TutorSpec(
        "music-drew",
        "Drew",
        "Hayes",
        "online",
        None,
        None,
        29,
        ("Music",),
        "Music fundamentals at your pace",
        "creative activities and regular check-ins",
    ),
    TutorSpec(
        "sat-peyton",
        "Peyton",
        "Ward",
        "both",
        "Dunwoody",
        "GA",
        53,
        ("SAT Math", "SAT English"),
        "Focused test-preparation routines",
        "targeted drills and progress reviews",
    ),
    TutorSpec(
        "biology-robin",
        "Robin",
        "Price",
        "in-person",
        "Johns Creek",
        "GA",
        37,
        ("Biology", "Chemistry", "ACT Science"),
        "Understanding the life sciences",
        "visual notes and practical study strategies",
    ),
    TutorSpec(
        "coding-sidney",
        "Sidney",
        "Turner",
        "both",
        "Kennesaw",
        "GA",
        47,
        ("Java", "Python", "C++", "JavaScript", "SQL"),
        "Programming fundamentals for beginners",
        "interactive examples and code reviews",
    ),
    TutorSpec(
        "math-alex",
        "Alex",
        "Rivera",
        "in-person",
        "Lawrenceville",
        "GA",
        35,
        ("Algebra", "Statistics"),
        "Math support with a steady pace",
        "repetition, visualization, and checkpoints",
    ),
    TutorSpec(
        "act-reese",
        "Reese",
        "Sullivan",
        "online",
        None,
        None,
        44,
        ("ACT English", "ACT Math", "ACT Reading", "ACT Science"),
        "Targeted ACT practice",
        "timed sections and strategy discussions",
    ),
    TutorSpec(
        "technology-blake",
        "Blake",
        "Morgan",
        "both",
        "Duluth",
        "GA",
        40,
        ("HTML", "CSS", "JavaScript"),
        "Building beginner-friendly websites",
        "hands-on mini projects and feedback",
    ),
    TutorSpec(
        "literature-samira",
        "Samira",
        "Bell",
        "in-person",
        "Brookhaven",
        "GA",
        32,
        ("US Literature",),
        "Reading comprehension and literary analysis",
        "annotating passages and conversation",
    ),
    TutorSpec(
        "social-devon",
        "Devon",
        "Clark",
        "both",
        "Peachtree Corners",
        "GA",
        39,
        ("US Government", "US History", "World History"),
        "Connecting civics and history",
        "concept comparisons and guided discussion",
    ),
    TutorSpec(
        "science-harper",
        "Harper",
        "Lane",
        "in-person",
        "Chamblee",
        "GA",
        46,
        ("Physics", "Chemistry", "Calculus", "Trigonometry"),
        "Problem-solving in STEM",
        "practice problems and visual explanations",
    ),
    TutorSpec(
        "stem-rowan",
        "Rowan",
        "West",
        "both",
        "Norcross",
        "GA",
        43,
        ("Statistics", "Python"),
        "Using data to understand the world",
        "small datasets and step-by-step exercises",
    ),
    TutorSpec(
        "nyc-emery",
        "Emery",
        "Stone",
        "both",
        "New York",
        "NY",
        65,
        ("SAT Math", "Calculus", "Statistics"),
        "Math and exam preparation",
        "diagnostic questions and custom practice",
    ),
    TutorSpec(
        "chicago-ellis",
        "Ellis",
        "Carter",
        "in-person",
        "Chicago",
        "IL",
        45,
        ("US History", "US Government"),
        "Making social studies memorable",
        "real examples and review games",
        "America/Chicago",
    ),
    TutorSpec(
        "la-skyler",
        "Skyler",
        "Adams",
        "both",
        "Los Angeles",
        "CA",
        58,
        ("Python", "JavaScript", "HTML", "CSS", "C#"),
        "Coding skills through creative projects",
        "small builds and troubleshooting",
        "America/Los_Angeles",
    ),
    TutorSpec(
        "miami-bailey",
        "Bailey",
        "James",
        "in-person",
        "Miami",
        "FL",
        41,
        ("Biology",),
        "Biology topics explained clearly",
        "illustrations and frequent recall exercises",
    ),
    TutorSpec(
        "charlotte-kendall",
        "Kendall",
        "Fox",
        "both",
        "Charlotte",
        "NC",
        49,
        ("ACT Full Prep", "ACT Math", "ACT English", "ACT Reading"),
        "Confidence for standardized tests",
        "test-taking strategy and constructive feedback",
    ),
    TutorSpec(
        "art-ashton",
        "Ashton",
        "Brooks",
        "online",
        None,
        None,
        28,
        ("Art",),
        "Creative confidence and art basics",
        "simple projects and encouraging critique",
    ),
)

MEETING_PREFERENCES = (
    "Public libraries",
    "Public cafes",
    "Public campus spaces",
    "Public libraries or cafes",
)
# TutorME uses Sunday=0, Monday=1, ..., Saturday=6; values are minutes since midnight.
WEEKLY_SCHEDULES = (
    ((1, 960, 1200), (3, 960, 1200), (5, 900, 1140)),
    ((2, 900, 1140), (4, 900, 1140)),
    ((0, 660, 900), (6, 660, 900)),
    ((1, 1020, 1260), (4, 1020, 1260), (6, 720, 960)),
)


def validate_roster() -> None:
    slugs = [spec.slug for spec in ROSTER]
    if len(slugs) != len(set(slugs)):
        raise RuntimeError("Duplicate demo slugs")
    for spec in ROSTER:
        if spec.mode not in {"online", "in-person", "both"}:
            raise RuntimeError("Unknown demo lesson mode")
        if not 1 <= len(set(spec.subjects)) == len(spec.subjects) <= 5:
            raise RuntimeError(f"Invalid number of subjects for {spec.slug}")
        if (spec.city is None) != (spec.state is None):
            raise RuntimeError(f"Incomplete location for {spec.slug}")
        if (spec.mode == "online") != (spec.city is None):
            raise RuntimeError(f"Invalid lesson/location pairing for {spec.slug}")
        if not 0 <= spec.price <= 10000:
            raise RuntimeError(f"Invalid demo rate for {spec.slug}")
        if len(intro_for(spec)) > 255 or len(bio_for(spec)) > 1000:
            raise RuntimeError(f"Profile text too long for {spec.slug}")


def intro_for(spec: TutorSpec) -> str:
    return f"{spec.focus}. Supportive lessons with clear goals and practical exercises."


def bio_for(spec: TutorSpec) -> str:
    topics = ", ".join(spec.subjects)
    return (
        f"I offer approachable help with {topics}. Sessions emphasize {spec.approach}, "
        "adapted to each learner's goals. This is a fictional demonstration profile "
        "for exploring TutorME and is not available for real appointments."
    )


def check_target(db: Session, expected: tuple[str, str, str]) -> None:
    actual = tuple(
        db.execute(
            text(
                "SELECT current_setting('neon.project_id', true), "
                "current_setting('neon.branch_id', true), current_database()"
            )
        ).one()
    )
    if actual != expected:
        raise RuntimeError("Neon project/branch/database mismatch; no changes made")


def locations_by_city(db: Session) -> dict[tuple[str, str], ServiceArea]:
    wanted = {(spec.city, spec.state) for spec in ROSTER if spec.city is not None}
    states = {state for _, state in wanted}
    # Restrict to independently sourced Census *places* from 2025 (not ZIP centroids).
    areas = db.scalars(
        select(ServiceArea).where(
            ServiceArea.country == "US",
            ServiceArea.region.in_(states),
            ServiceArea.id.like("census-2025-place-%"),
            ServiceArea.source == "US Census Gazetteer 2025",
        )
    ).all()
    matches: dict[tuple[str, str], list[ServiceArea]] = {key: [] for key in wanted}
    for area in areas:
        key = (name_key(geographic_display_name(area)), area.region)
        for city, state in wanted:
            if key == (name_key(city), state):
                matches[(city, state)].append(area)
    missing = [f"{city}, {state}" for (city, state), found in sorted(matches.items()) if not found]
    ambiguous = [
        f"{city}, {state}" for (city, state), found in sorted(matches.items()) if len(found) > 1
    ]
    if missing:
        raise RuntimeError(
            "Missing required 2025 Census place records: "
            + ", ".join(missing)
            + ". Import 2025 place data into the TARGET branch first; no demo profiles written"
        )
    if ambiguous:
        raise RuntimeError(
            "Ambiguous Census place names: "
            + ", ".join(ambiguous)
            + ". Resolve matching area IDs manually; no demo profiles written"
        )
    return {key: found[0] for key, found in matches.items()}


def seed_profiles(db: Session, *, apply: bool) -> tuple[int, int]:
    """Must be called within one database transaction after identity verification."""
    validate_roster()
    location_catalog = locations_by_city(db)
    existing_subjects = {s.name: s for s in db.scalars(select(Subject)).all()}
    all_needed = {subject for spec in ROSTER for subject in spec.subjects}
    missing = sorted(all_needed - existing_subjects.keys())
    if not apply and missing:
        print(
            f"Preview: {len(missing)} missing subject names; --apply will add canonical subjects only: "
            + ", ".join(missing)
        )
    if apply:
        # Create missing catalog entries ONLY, using TutorME's existing approved seed function.
        seed_subjects(db)
        db.flush()
        existing_subjects = {s.name: s for s in db.scalars(select(Subject)).all()}
        if not all_needed.issubset(existing_subjects):
            raise RuntimeError("Required subjects absent from canonical catalog; rolled back")

    existing_users = {
        u.auth_id: u
        for u in db.scalars(
            select(User).where(User.auth_id.in_([f"{NAMESPACE}{spec.slug}" for spec in ROSTER]))
        ).all()
    }
    created = skipped = 0
    for idx, spec in enumerate(ROSTER):
        auth_id = f"{NAMESPACE}{spec.slug}"
        email = f"seed-v2-{spec.slug}@{EMAIL_DOMAIN}"
        existing = existing_users.get(auth_id)
        if existing is not None:
            if (
                existing.role != UserRole.TUTOR
                or existing.email != email
                or existing.tutor_profile is None
                or not existing.tutor_profile.is_demo
            ):
                raise RuntimeError(
                    "Reserved demo identifier is in use by a non-demo account; rolled back"
                )
            skipped += 1  # Preserve existing demos without rewriting any profile or schedule.
            continue
        print(
            f"{'CREATE' if apply else 'PREVIEW'} {spec.first} {spec.last}: "
            f"{spec.mode}; {spec.city + ', ' + spec.state if spec.city else 'online only'}; "
            f"{len(spec.subjects)} subjects; ${spec.price}/hour"
        )
        if not apply:
            created += 1
            continue
        user = User(
            auth_id=auth_id,
            email=email,
            first_name=spec.first,
            last_name=spec.last,
            role=UserRole.TUTOR,
            timezone=spec.timezone,
        )
        area = location_catalog.get((spec.city, spec.state)) if spec.city else None
        profile = TutorProfile(
            user=user,
            intro=intro_for(spec),
            bio=bio_for(spec),
            price=float(spec.price),
            is_demo=True,
            online_enabled=spec.mode in {"online", "both"},
            in_person_enabled=spec.mode in {"in-person", "both"},
            service_area_id=area.id if area else None,
            travel_radius_miles=float((10, 15, 20, 25, 30, 35)[idx % 6]) if area else 0,
            meeting_preferences=MEETING_PREFERENCES[idx % len(MEETING_PREFERENCES)]
            if area
            else None,
            subjects=[existing_subjects[subject] for subject in spec.subjects],
            availability=[
                TutorAvailability(
                    type=AvailabilityType.WEEKLY,
                    day_of_the_week=day,
                    date=None,
                    start_time=start,
                    end_time=end,
                    timezone=spec.timezone,
                )
                for day, start, end in WEEKLY_SCHEDULES[idx % len(WEEKLY_SCHEDULES)]
            ],
        )
        db.add(profile)
        created += 1
    return created, skipped


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Preview or create fictional TutorME demo tutors safely"
    )
    parser.add_argument("--expected-project-id", required=True)
    parser.add_argument("--expected-branch-id", required=True)
    parser.add_argument("--expected-database", required=True)
    parser.add_argument(
        "--apply", action="store_true", help="Write records. Without this, read-only preview."
    )
    args = parser.parse_args()
    engine = None
    try:
        validate_roster()
        url = make_url(settings.database_url)
        if url.drivername in {"postgresql", "postgres"}:
            url = url.set(drivername="postgresql+psycopg")
        if url.drivername != "postgresql+psycopg":
            raise RuntimeError(
                "Requires a PostgreSQL URL supported by the installed psycopg driver"
            )
        if url.query.get("sslmode") not in {"require", "verify-ca", "verify-full"}:
            raise RuntimeError("An explicitly TLS-secured Neon DATABASE_URL is required")
        engine = create_engine(
            url, poolclass=NullPool, hide_parameters=True, connect_args={"connect_timeout": 10}
        )
        with Session(engine) as db:
            with db.begin():
                if not args.apply:
                    db.execute(text("SET TRANSACTION READ ONLY"))
                check_target(
                    db, (args.expected_project_id, args.expected_branch_id, args.expected_database)
                )
                print(
                    f"Verified target project={args.expected_project_id} branch={args.expected_branch_id} "
                    f"database={args.expected_database}"
                )
                n, skipped = seed_profiles(db, apply=args.apply)
                if args.apply:
                    db.flush()  # Surface FK/constraint failures before transaction is committed.
            # Transaction commits atomically only here, after every demo profile succeeds.
        modes = Counter(spec.mode for spec in ROSTER)
        print(
            f"{'APPLIED' if args.apply else 'DRY RUN'}: {n} "
            f"{'created' if args.apply else 'would create'}, {skipped} existing demo records preserved; "
            f"roster: {dict(modes)}"
        )
        return 0
    except RuntimeError as exc:
        print(f"Seed stopped safely: {exc}")
        return 1
    except (SQLAlchemyError, ValueError, OSError) as exc:
        print(
            f"Seed stopped; database transaction rolled back ({type(exc).__name__}). "
            "Check connection, migrations, and Census/subjects. No secrets printed."
        )
        return 1
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
