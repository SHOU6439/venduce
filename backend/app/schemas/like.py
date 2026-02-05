from pydantic import BaseModel, ConfigDict
from datetime import datetime


class LikeResponse(BaseModel):
    id: str
    user_id: str
    post_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
