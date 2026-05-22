from pydantic import BaseModel, field_validator
from typing import Optional

class HealthResponse(BaseModel):
    status: str
    version: str

class GenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = "default"

    @field_validator("prompt")
    @classmethod
    def prompt_length(cls, v):
        if len(v) > 1000:
            raise ValueError("Prompt too long (max 1000 characters)")
        if len(v.strip()) == 0:
            raise ValueError("Prompt cannot be empty")
        return v.strip()

class GenerateResponse(BaseModel):
    success: bool
    message: str
    image_url: Optional[str] = None
