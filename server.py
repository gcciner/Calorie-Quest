"""Punto de entrada para ejecutar el servidor Full-Stack de Calorie Quest."""
import argparse
import sys
from pathlib import Path

import uvicorn

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def main():
    parser = argparse.ArgumentParser(description="Servidor web Calorie Quest")
    parser.add_argument("--host", default="127.0.0.1", help="Host de escucha")
    parser.add_argument("--port", type=int, default=8000, help="Puerto HTTP")
    parser.add_argument("--reload", action="store_true", help="Recarga automática en desarrollo")
    args = parser.parse_args()

    uvicorn.run(
        "backend.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        app_dir=str(ROOT_DIR),
    )


if __name__ == "__main__":
    main()
