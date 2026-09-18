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
    tutors = [
        {
            "user_id": 11,
            "intro": "Hello, I am a tutor.",
            "bio": "I have been tutoring for several years. I am very experienced and excited to help you learn whatever subject you'd like!",
            "price": 35.0
        },
        {
            "user_id": 12,
            "intro": "Hello, I am a tutor.",
            "bio": "I have been tutoring for several years. I am very experienced and excited to help you learn whatever subject you'd like!",
            "price": 35.0
        },
        {
            "user_id": 14,
            "intro": "Hello, I am a tutor.",
            "bio": "I have been tutoring for several years. I am very experienced and excited to help you learn whatever subject you'd like!",
            "price": 35.0
        },
        {
            "user_id": 15,
            "intro": "Hello, I am a tutor.",
            "bio": "I have been tutoring for several years. I am very experienced and excited to help you learn whatever subject you'd like!",
            "price": 35.0
        },
    ]

    for tutor in tutors:
        existing = (
            db.query(TutorProfile)
            .filter(TutorProfile.user_id == tutor["user_id"])
            .first()
        )

        if not existing:
            db.add(
                TutorProfile(
                    user_id=tutor["user_id"],
                    intro=tutor["intro"],
                    bio=tutor["bio"],
                    price=tutor["price"]
                )
            )

def seed():
    with SessionLocal() as db:
        try:
            seed_subjects(db)
            seed_tutor_profiles(db)
            db.commit()
        except:
            db.rollback()
            raise

if __name__ == "__main__":
    seed()

        