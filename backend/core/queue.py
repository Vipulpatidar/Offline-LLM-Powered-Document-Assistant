import threading
import queue
import traceback

_job_queue = queue.Queue()


def worker():
    print("WORKER LOOP STARTED")

    while True:
        print("WAITING FOR JOB")
        func, args, kwargs = _job_queue.get()
        print("GOT JOB:", func.__name__, args)

        try:
            func(*args, **kwargs)   
        except Exception:
            traceback.print_exc()
        finally:
            _job_queue.task_done()


def start_worker():
    t = threading.Thread(target=worker, daemon=True)
    t.start()
    print("Worker thread started.")


def enqueue(func, *args, **kwargs):
    print("ENQUEUE CALLED", func.__name__, args)
    _job_queue.put((func, args, kwargs))
    
    
def queue_size():
    return _job_queue.qsize()
    
