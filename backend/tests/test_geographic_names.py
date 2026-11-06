import unittest
from sqlalchemy import select, func
from app.services.geographic_names import normalize_census_place_name, geographic_display_name
from app.schemas.location import ServiceAreaResponse
from app.models.service_area import ServiceArea
from app.models.tutor_profile import TutorProfile
import test_locations as fixtures


def place(code="1304000", name="Atlanta city", region="GA", **extra):
    return ServiceArea(id=f"census-2025-place-{code}", name=name, region=region, country="US", postal_code=None,
        latitude=33.75,longitude=-84.39,source="US Census Gazetteer 2025",**extra)


class NameTests(unittest.TestCase):
    def test_examples_and_idempotence(self):
        examples={"Atlanta city":"Atlanta","Atlanta town":"Atlanta","Atlanta village":"Atlanta","Atlanta CDP":"Atlanta",
            "New York city":"New York","Los Angeles city":"Los Angeles","Ocean City city":"Ocean City",
            "New York":"New York","Town and Country city":"Town and Country","The Village village":"The Village",
            "  Atlanta   city  ":"Atlanta","ATLANTA city":"ATLANTA","Atlanta cdp":"Atlanta",
            "Atlanta City":"Atlanta City","City":"City","Town":"Town","Village":"Village",
            "Juneau city and borough":"Juneau","Anchorage municipality":"Anchorage",
            "Example unified government (balance)":"Example (balance)","Milford city (balance)":"Milford (balance)",
            "Example zona urbana":"Example","Example comunidad":"Example","Example corporation":"Example",
            "Example metropolitan government":"Example","Example urban county":"Example",
            "Example consolidated government":"Example","Example city town":"Example city town",
            "Example unknown district":"Example unknown district","Nashville-Davidson (balance)":"Nashville-Davidson (balance)"}
        for original, expected in examples.items():
            with self.subTest(original=original):
                actual=normalize_census_place_name(original)
                self.assertEqual(actual,expected)
                self.assertEqual(normalize_census_place_name(actual),actual)

    def test_provenance_and_immutability(self):
        area=place();before={c.name:getattr(area,c.name) for c in ServiceArea.__table__.columns}
        response=ServiceAreaResponse.model_validate(area).model_dump(by_alias=True)
        self.assertEqual(response["name"],"Atlanta city")
        self.assertEqual(response["displayName"],"Atlanta");self.assertEqual(response["displayLabel"],"Atlanta, GA")
        self.assertEqual(before,{c.name:getattr(area,c.name) for c in ServiceArea.__table__.columns})
        for field,value in (("source","Other catalog"),("id","other-place"),("country","CA"),("postal_code","12345")):
            area=place();setattr(area,field,value)
            self.assertEqual(geographic_display_name(area),"Atlanta city")

    def test_zcta_display_region_and_no_fabricated_state(self):
        for region,label in (("","00123, US"),("PR","00123, PR")):
            area=ServiceArea(id="census-2025-zcta-00123",name="ZIP area 00123",postal_code="00123",region=region,
                country="US",latitude=0,longitude=0,source="US Census Gazetteer 2025")
            self.assertEqual(ServiceAreaResponse.model_validate(area).display_label,label)


class ResolutionTests(unittest.TestCase):
    setUp=fixtures.LocationTests.setUp
    tearDown=fixtures.LocationTests.tearDown
    search=fixtures.LocationTests.search

    def add_places(self):
        self.georgia=place();self.indiana=place("1802866","Atlanta town","IN")
        self.db.add_all([self.georgia,self.indiana]);self.db.commit()

    def resolve(self,city="Atlanta",region="GA"):
        return self.client.post("/api/locations/resolve",json={"country":"US","city":city,"region":region})

    def test_google_resolves_normalized_original_case_and_state(self):
        self.add_places()
        for city in ("Atlanta","atlanta"," Atlanta  ","Atlanta city"):
            result=self.resolve(city);self.assertEqual(result.status_code,200,result.text)
            self.assertEqual(result.json()["id"],self.georgia.id)
            self.assertEqual(result.json()["displayLabel"],"Atlanta, GA")
        self.assertEqual(self.resolve(region="IN").json()["id"],self.indiana.id)
        self.assertEqual(self.resolve(region="MI").status_code,422)

    def test_same_state_collision_is_not_merged(self):
        self.add_places();self.db.add(place("1399999","Atlanta CDP","GA"));self.db.commit()
        self.assertEqual(self.resolve().status_code,409)
        self.assertEqual(self.resolve("Atlanta city").json()["id"],self.georgia.id)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(ServiceArea).where(ServiceArea.region=="GA")),2)

    def test_search_original_normalized_and_region(self):
        self.add_places()
        self.assertEqual(len(self.client.get("/api/locations/areas",params={"q":"Atlanta"}).json()),2)
        self.assertEqual(self.client.get("/api/locations/areas",params={"q":"Atlanta, GA"}).json()[0]["id"],self.georgia.id)
        self.assertEqual(self.client.get("/api/locations/areas",params={"q":"Atlanta city"}).json()[0]["displayName"],"Atlanta")

    def test_existing_radius_identifiers_and_nested_display_unchanged(self):
        self.add_places();tutor=self.db.get(TutorProfile,2);tutor.service_area_id=self.georgia.id;self.db.commit()
        result=self.search(mode="in-person",areaId=self.georgia.id,radius=0)
        self.assertEqual(result["total"],1)
        area=result["items"][0]["serviceArea"]
        self.assertEqual(area["id"],self.georgia.id);self.assertEqual(area["latitude"],33.75)
        self.assertEqual(area["displayLabel"],"Atlanta, GA");self.assertEqual(area["name"],"Atlanta city")

    def test_zip_resolution_is_preserved(self):
        area=ServiceArea(id="census-2025-zcta-00123",name="ZIP area 00123",postal_code="00123",region="",
            country="US",latitude=0,longitude=0,source="US Census Gazetteer 2025")
        self.db.add(area);self.db.commit()
        result=self.client.post("/api/locations/resolve",json={"country":"US","postalCode":"00123"})
        self.assertEqual(result.status_code,200,result.text);self.assertEqual(result.json()["displayLabel"],"00123, US")

    def test_balance_qualifier_remains_searchable_and_distinct(self):
        area=place("0999999","Milford city (balance)","CT")
        self.db.add(area);self.db.commit()
        result=self.resolve("Milford (balance)","CT")
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(result.json()["displayLabel"],"Milford (balance), CT")
        self.assertEqual(self.resolve("Milford","CT").status_code,422)
        self.assertEqual(self.client.get("/api/locations/areas",params={"q":"Milford (balance), CT"}).json()[0]["id"],area.id)
