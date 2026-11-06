from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.subject import Subject, SubjectCategory
from app.models.tutor_profile import TutorProfile

def seed_subjects(db: SessionLocal):
    subjects = [
        {"name": "Algebra", "category": SubjectCategory.MATH},
        {"name": "Geometry", "category": SubjectCategory.MATH},
        {"name": "Calculus", "category": SubjectCategory.MATH},
        {"name": "Statistics", "category": SubjectCategory.MATH},
        {"name": "Trigonometry", "category": SubjectCategory.MATH},
        {"name": "Physics", "category": SubjectCategory.SCIENCE},
        {"name": "Chemistry", "category": SubjectCategory.SCIENCE},
        {"name": "Biology", "category": SubjectCategory.SCIENCE},
        {"name": "Grammar", "category": SubjectCategory.ENGLISH},
        {"name": "US Literature", "category": SubjectCategory.ENGLISH},
        {"name": "US History", "category": SubjectCategory.SOCIAL_STUDIES},
        {"name": "World History", "category": SubjectCategory.SOCIAL_STUDIES},
        {"name": "US Government", "category": SubjectCategory.SOCIAL_STUDIES},
        {"name": "Geography", "category": SubjectCategory.SOCIAL_STUDIES},
        {"name": "Java", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "Python", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "C++", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "C#", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "JavaScript", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "HTML", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "CSS", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "SQL", "category": SubjectCategory.COMPUTER_SCIENCE},
        {"name": "SAT Math", "category": SubjectCategory.SAT_PREP},
        {"name": "SAT English", "category": SubjectCategory.SAT_PREP},
        {"name": "SAT Full Prep", "category": SubjectCategory.SAT_PREP},
        {"name": "ACT Math", "category": SubjectCategory.ACT_PREP},
        {"name": "ACT English", "category": SubjectCategory.ACT_PREP},
        {"name": "ACT Reading", "category": SubjectCategory.ACT_PREP},
        {"name": "ACT Science", "category": SubjectCategory.ACT_PREP},
        {"name": "ACT Full Prep", "category": SubjectCategory.ACT_PREP},
        {"name": "Art", "category": SubjectCategory.OTHER},
        {"name": "Music", "category": SubjectCategory.OTHER},
    ]

    for subject in subjects:
        existing = (
            db.query(Subject)
            .filter(Subject.name == subject["name"])
            .first()
        )

        if not existing:
            db.add(Subject(name=subject["name"], category=subject["category"]))

def seed_tutor_profiles(db: SessionLocal):
    """Only create explicitly fictional records in a reserved non-login namespace.
    Legacy IDs 11/12/14/15 cannot be positively classified and are untouched.
    """
    for slug, first, last, subject_name in [
        ("math-guide", "Alex", "Sample", "Algebra"),
        ("coding-guide", "Morgan", "Example", "Python"),
    ]:
        auth_id = f"demo:seed-v1:{slug}"
        existing = db.query(User).filter(User.auth_id == auth_id).first()
        if existing:
            # Fail closed if the reserved identifier is unexpectedly associated with a real profile.
            if not existing.tutor_profile or not existing.tutor_profile.is_demo:
                raise RuntimeError("Reserved demo identifier already exists without demo provenance; review manually")
            continue
        user = User(auth_id=auth_id, email=f"{slug}@example.invalid", first_name=first, last_name=last,
                    role=UserRole.TUTOR, timezone="America/New_York")
        profile = TutorProfile(user=user, intro="Fictional demonstration tutor. Not available for real appointments.",
            bio="Sample profile created only to demonstrate the TutorME interface. This is not a real tutor.",
            price=35, is_demo=True, online_enabled=True, in_person_enabled=False)
        subject = db.query(Subject).filter(Subject.name == subject_name).first()
        if subject:
            profile.subjects = [subject]
        db.add(profile)


def seed(include_demo_tutors=False):
    with SessionLocal() as db:
        try:
            seed_subjects(db)
            if include_demo_tutors:
                seed_tutor_profiles(db)
            db.commit()
        except:
            db.rollback()
            raise

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Explicit catalog/demo seed; never run automatically")
    parser.add_argument("--include-demo-tutors", action="store_true")
    seed(parser.parse_args().include_demo_tutors)

        