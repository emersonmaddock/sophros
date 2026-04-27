from datetime import datetime

from pydantic import BaseModel


class GoogleCalendarStatus(BaseModel):
    connected: bool
    email: str | None = None
    last_synced_at: datetime | None = None
    sync_status: str | None = None
    needs_reconnect: bool = False


class GoogleCalendarSyncResult(BaseModel):
    synced_count: int
    sync_batch_id: str


class GoogleCalendarDisconnectResult(BaseModel):
    removed_busy_blocks: int
