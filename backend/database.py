import os
from contextlib import contextmanager
from langgraph.checkpoint.postgres import PostgresSaver
from dotenv import load_dotenv

load_dotenv()

DB_URL=os.getenv("POSTGRES_URL")

@contextmanager
def get_checkpointer():
    with PostgresSaver.from_conn_string(DB_URL) as checkpointer:
        checkpointer.setup()
        yield checkpointer