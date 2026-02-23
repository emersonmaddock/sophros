from pydantic import BaseModel


class SyncResult(BaseModel):
    items_synced: int
    items_updated: int
    items_deleted: int
    errors: list[str] = []
