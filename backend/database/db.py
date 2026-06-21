"""
SQLite database connection and initialization.

Uses aiosqlite for async access. Creates all tables on startup
if they don't already exist.
"""

import aiosqlite
from config import settings
from database.models import CREATE_TABLES_SQL

# Module-level connection reference
_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    """Get the active database connection."""
    global _db
    if _db is None:
        _db = await aiosqlite.connect(settings.database_path)
        _db.row_factory = aiosqlite.Row
    return _db


async def init_db() -> None:
    """Initialize database and create tables if they don't exist."""
    db = await get_db()
    for sql in CREATE_TABLES_SQL:
        await db.execute(sql)
    await db.commit()
    print("[DB] All tables initialized")


async def close_db() -> None:
    """Close the database connection."""
    global _db
    if _db is not None:
        await _db.close()
        _db = None
