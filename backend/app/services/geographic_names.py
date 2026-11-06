"""Read-only display normalization for independently sourced Census records.
Canonical Census suffix casing matters: title-cased City/Town/Village can be
part of the actual name. Never title-case names or recursively strip suffixes.
"""
import re

# Longest first. (balance) is retained because it identifies a distinct geography.
CLASSIFICATIONS = tuple(sorted(("city and borough", "consolidated government", "unified government",
    "metropolitan government", "urban county", "zona urbana", "municipality", "corporation",
    "comunidad", "borough", "village", "city", "town", "CDP"), key=len, reverse=True))
PLACE_ID = re.compile(r"^census-(20[0-9]{2})-place-[0-9]{7}$")
ZCTA_ID = re.compile(r"^census-(20[0-9]{2})-zcta-[0-9]{5}$")


def census_kind(area):
    if area.country != "US":
        return None
    for kind, pattern in (("place", PLACE_ID), ("zcta", ZCTA_ID)):
        match = pattern.fullmatch(area.id)
        if match and area.source == f"US Census Gazetteer {match[1]}":
            if kind == "place" and area.postal_code is None:
                return kind
            if kind == "zcta" and area.postal_code == area.id.rsplit("-", 1)[1]:
                return kind
    return None


def _classification(name):
    for suffix in CLASSIFICATIONS:
        # CDP is an acronym; tolerate casing. Other suffixes use official lowercase.
        if name.endswith(" " + suffix) or (suffix == "CDP" and name.lower().endswith(" cdp")):
            return name[:-(len(suffix) + 1)], suffix
    return None


def normalize_census_place_name(name):
    """Only call for recognized Census place records. Idempotent, conservative text rule."""
    clean = " ".join(name.split())
    balance = " (balance)" if clean.endswith(" (balance)") else ""
    stem = clean[:-len(balance)] if balance else clean
    if stem in CLASSIFICATIONS:
        return clean
    classified = _classification(stem)
    if not classified:
        return clean
    base, _ = classified
    # Multiple trailing canonical classifications are uncertain; don't strip either.
    if not base or base in CLASSIFICATIONS or _classification(base):
        return clean
    return base + balance


def geographic_display_name(area):
    kind = census_kind(area)
    if kind == "place":
        return normalize_census_place_name(area.name)
    if kind == "zcta":
        return area.postal_code
    return area.name


def geographic_display_label(area):
    name = geographic_display_name(area)
    # ZCTA has no state in some official inputs. Do not infer one from the ZIP.
    parts = [name, area.region]
    if area.country != "US" or not area.region:
        parts.append(area.country)
    return ", ".join(part for part in parts if part)


def name_key(name):
    return " ".join(name.split()).casefold()
