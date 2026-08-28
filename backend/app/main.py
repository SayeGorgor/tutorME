from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import locations

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(
    locations.router,
    prefix="/api/locations",
    tags=["locations"]
)

@app.get("/")
def root():
    return {'message': 'TutorME backend is running successfully!'}