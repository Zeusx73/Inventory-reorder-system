from langgraph.checkpoint.memory import MemorySaver
from contextlib import contextmanager

@contextmanager
def get_checkpointer():
    checkpointer = MemorySaver()
    try:
        yield checkpointer
    finally:
        pass