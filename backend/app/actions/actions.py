import logging

import jwt
from jwt import PyJWKClient

from urllib.parse import urlparse

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.core.config import settings
from app.models.user import User

from math import radians, sin, cos, sqrt, atan2

NEON_AUTH_BASE_URL = settings.neon_auth_base_url
NEON_AUTH_JWKS_URL = settings.neon_auth_jwks_url

parsed_neon_auth_base_url = urlparse(NEON_AUTH_BASE_URL)
NEON_AUTH_ISSUER_AUDIENCE = f"{parsed_neon_auth_base_url.scheme}://{parsed_neon_auth_base_url.netloc}"

logger = logging.getLogger(__name__)

security = HTTPBearer()

jwks_client = PyJWKClient(NEON_AUTH_JWKS_URL)

def get_identity(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token, 
            signing_key.key, 
            algorithms=["EdDSA"],
            issuer=NEON_AUTH_ISSUER_AUDIENCE,
            audience=NEON_AUTH_ISSUER_AUDIENCE,
            leeway=10
        )
    
    except jwt.ExpiredSignatureError:
        logger.exception("Token has expired")
        raise HTTPException(
            status_code=401, 
            detail="Token has expired"
        )
    
    except (jwt.InvalidTokenError, jwt.PyJWKClientError):
        logger.exception("Invalid token")
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    
    auth_id = payload.get("sub")

    if not isinstance(auth_id, str) or not auth_id.strip():
        logger.exception("Invalid Auth ID")
        raise HTTPException(
            status_code=401,
            detail="Invalid Auth ID"
        )

    return payload


def get_current_user(identity: dict = Depends(get_identity), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.auth_id == identity["sub"]).first()

    if not user:
        raise HTTPException(status_code=404, detail={
            "code": "REGISTRATION_INCOMPLETE",
            "message": "Your sign-in account exists. Finish account setup to create your TutorME profile.",
        })

    return user

def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    radius = 3958.8  # Earth's radius in miles

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return radius * c