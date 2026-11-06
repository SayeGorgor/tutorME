import unittest
import test_marketplace as fixtures
from app.models.user import User

class TutorRateTests(unittest.TestCase):
    setUp=fixtures.MarketplaceTests.setUp
    tearDown=fixtures.MarketplaceTests.tearDown
    actor=fixtures.MarketplaceTests.actor

    def test_owner_rate_update_persists_and_public_profile_uses_it(self):
        self.actor(self.db.get(User,1))
        response=self.client.patch("/api/tutors/user/1",json={"price":27.50})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()["price"],27.50)
        self.assertEqual(self.client.get("/api/tutors/user/1").json()["price"],27.50)

    def test_invalid_rates_rejected_without_changing_rate(self):
        self.actor(self.db.get(User,1))
        before=self.client.get("/api/tutors/user/1").json()["price"]
        for price in (-1,10001,"NaN","Infinity"):
            self.assertEqual(self.client.patch("/api/tutors/user/1",json={"price":price}).status_code,422)
        self.assertEqual(self.client.get("/api/tutors/user/1").json()["price"],before)

    def test_only_own_tutor_can_change_rate(self):
        self.assertEqual(self.client.patch("/api/tutors/user/1",json={"price":42}).status_code,403)
        self.actor(self.db.get(User,2))
        self.assertEqual(self.client.patch("/api/tutors/user/1",json={"price":42}).status_code,403)
