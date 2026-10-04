from motor.motor_asyncio import AsyncIOMotorClient

from .core.config import settings

client: AsyncIOMotorClient | None = None


def get_database():
    if client is None:
        raise RuntimeError("MongoDB no esta inicializado.")
    return client[settings.mongodb_db_name]


async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(settings.mongodb_uri)


async def close_mongo_connection():
    global client
    if client is not None:
        client.close()
        client = None
