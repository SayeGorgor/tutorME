import unittest
from sqlalchemy import event, select, func
import test_marketplace as fixtures
from app.main import app
from app.actions.actions import get_current_user
from app.models.user import User
from app.models.subject import Subject, SubjectCategory
from app.models.tutor_profile import TutorProfile

class CustomSubjectTests(unittest.TestCase):
    setUp=fixtures.MarketplaceTests.setUp
    tearDown=fixtures.MarketplaceTests.tearDown
    actor=fixtures.MarketplaceTests.actor

    def tutor(self):
        self.actor(self.db.get(User,1))
        @event.listens_for(self.db,"before_flush")
        def ids(session,*_):
            for row in session.new:
                if isinstance(row,Subject) and row.id is None:
                    row.id=(session.scalar(select(func.max(Subject.id))) or 0)+1

    def test_create_custom_then_assign_save_and_clear(self):
        self.tutor()
        response=self.client.post("/api/subjects/",json={"name":"  Music   theory  "})
        self.assertEqual(response.status_code,200,response.text)
        subject=response.json();self.assertEqual(subject["name"],"Music theory");self.assertEqual(subject["category"],"Other")
        self.assertEqual(self.db.get(TutorProfile,1).subjects,[])  # Add does not implicitly publish a teaching badge.
        response=self.client.patch("/api/tutors/user/1",json={"subjectIds":[subject["id"]]})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()["subjects"][0]["name"],"Music theory")
        self.assertEqual(self.client.get("/api/tutors/user/1").json()["subjects"][0]["id"],subject["id"])
        self.assertEqual(self.client.get("/api/tutors/search",params={"subject":"music theory"}).json()["total"],1)
        self.assertEqual(self.client.patch("/api/tutors/user/1",json={"subjectIds":[]}).json()["subjects"],[])

    def test_duplicate_case_and_whitespace_reuse_existing(self):
        self.tutor()
        first=self.client.post("/api/subjects/",json={"name":"Music theory"}).json()
        second=self.client.post("/api/subjects/",json={"name":"  MUSIC  THEORY "}).json()
        self.assertEqual(first["id"],second["id"])
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Subject)),1)

    def test_existing_category_preserved(self):
        self.tutor();self.db.add(Subject(id=50,name="Physics",category=SubjectCategory.SCIENCE));self.db.commit()
        response=self.client.post("/api/subjects/",json={"name":"physics"})
        self.assertEqual(response.json()["id"],50);self.assertEqual(response.json()["category"],"Science")

    def test_student_and_anonymous_cannot_add(self):
        self.assertEqual(self.client.post("/api/subjects/",json={"name":"Music"}).status_code,403)
        app.dependency_overrides.pop(get_current_user)
        self.assertIn(self.client.post("/api/subjects/",json={"name":"Music"}).status_code,(401,403))

    def test_invalid_names_rejected(self):
        self.tutor()
        for name in ("", "   ", "x"*101, "Bad\x00Name"):
            self.assertEqual(self.client.post("/api/subjects/",json={"name":name}).status_code,422)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Subject)),0)

    def test_other_tutor_profile_is_not_editable(self):
        self.tutor()
        subject=self.client.post("/api/subjects/",json={"name":"Music theory"}).json()
        self.assertEqual(self.client.patch("/api/tutors/user/2",json={"subjectIds":[subject["id"]]}).status_code,403)
        self.assertEqual(self.db.get(TutorProfile,2).subjects,[])
