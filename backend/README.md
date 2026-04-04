## General Workflow

By default, the dependencies are managed with [uv](https://docs.astral.sh/uv/), go there and install it.

From `./backend/` you can install all the dependencies with:

```bash
uv sync
```

Then you can activate the virtual environment with:

Linux/Unix/MacOS:

```bash
source .venv/bin/activate
```

Windows:

```bash
.venv\Scripts\activate
```

Make sure your editor is using the correct Python virtual environment, with the interpreter at `backend/.venv/bin/python`.

To run the application in development mode, use:

```bash
uv run fastapi app/main.py
```