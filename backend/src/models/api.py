from pydantic import BaseModel, field_validator
from typing import Optional, Any

class HealthResponse(BaseModel):
    status: str
    version: str

class SaveRequest(BaseModel):
    project_slug: str
    label: str = ""
    state: dict = {}

class SaveResponse(BaseModel):
    id: int
    message: str = "Saved"

class DeleteResponse(BaseModel):
    success: bool

class ScoreRequest(BaseModel):
    project_slug: str
    score: int
    metadata: Optional[dict] = {}
