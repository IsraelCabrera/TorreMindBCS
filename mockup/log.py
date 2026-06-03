import logging
import logging.handlers
import sys
from pathlib import Path


def _clean_log_file(log_path: Path, log_file: str) -> None:
    base = log_path / log_file
    base.unlink(missing_ok=True)
    for i in range(1, 10):
        (log_path / f"{log_file}.{i}").unlink(missing_ok=True)


def setup_logging(
    name: str = "mockup",
    log_dir: str = "logs",
    log_file: str = "mockup.log",
    level: int = logging.DEBUG,
    clean: bool = True,
) -> logging.Logger:
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    if clean:
        _clean_log_file(log_path, log_file)

    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = logging.handlers.RotatingFileHandler(
        log_path / log_file,
        mode="w",
        maxBytes=10_485_760,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(level)
    stream_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
