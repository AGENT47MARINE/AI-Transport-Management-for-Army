from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.endpoints import assets, convoys, routes, optimization, checkpoints
import app.models.asset 
import app.models.convoy # Register Convoy model
import app.models.route # Register Route model

# Initialize the FastAPI application
app = FastAPI(title=settings.PROJECT_NAME)

# Set up CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create tables on startup (simplest way for dev)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Register Routers
app.include_router(assets.router, prefix=f"{settings.API_V1_STR}/assets", tags=["assets"])
app.include_router(convoys.router, prefix=f"{settings.API_V1_STR}/convoys", tags=["convoys"])
app.include_router(routes.router, prefix=f"{settings.API_V1_STR}/routes", tags=["routes"])
app.include_router(optimization.router, prefix=f"{settings.API_V1_STR}/optimization", tags=["optimization"])
app.include_router(checkpoints.router, prefix=f"{settings.API_V1_STR}/checkpoints", tags=["checkpoints"])
from app.api.endpoints import logistics, auth
app.include_router(logistics.router, prefix=f"{settings.API_V1_STR}/logistics", tags=["logistics"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

# Basic Health Check Endpoint
@app.get("/")
async def root():
    """
    Simple health check to verify the API is running.
    """
    return {"message": "AI Transport Ops System is running"}
