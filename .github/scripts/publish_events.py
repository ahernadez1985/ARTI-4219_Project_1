"""Lee el evento push de GitHub Actions y guarda un documento por archivo en Firestore.

Se ejecuta dentro del workflow (ver push-to-firestore.yml). Usa el mismo esquema y los
mismos IDs que app/extractor.py + app/store.py, así los datos son idénticos a los del
receptor por webhook.

Variables de entorno: GITHUB_EVENT_PATH y GITHUB_RUN_ID (las pone Actions),
GCP_PROJECT, FIRESTORE_DATABASE, FIRESTORE_COLLECTION, WATCH_BRANCH,
WATCH_PATH_PREFIX, WATCH_ACTIONS, DRY_RUN=1 (solo imprime, no escribe).
"""
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone


def parse_ts(value):
    try:
        return datetime.fromisoformat(value) if value else None
    except ValueError:
        return None


def ensure_full_history():
    """Con un checkout superficial (fetch-depth 1) git no ve el commit padre y
    diff-tree no devuelve nada. Si el repo es superficial, se completa el historial."""
    try:
        shallow = subprocess.run(
            ["git", "rev-parse", "--is-shallow-repository"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if shallow == "true":
            print("Checkout superficial: descargando historial completo")
            subprocess.run(["git", "fetch", "--unshallow", "--quiet"], check=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"Aviso: no se pudo completar el historial ({exc})")


def changed_files(commit):
    """Archivos del commit leídos de git (no del payload).

    El payload viene con las listas vacías en commits de merge de PR, así que se
    consulta git con --first-parent. Requiere checkout con fetch-depth: 0.
    Si git falla, se usan las listas del payload.
    """
    sha = commit.get("id", "")
    try:
        out = subprocess.run(
            ["git", "-c", "core.quotepath=false", "diff-tree", "--no-commit-id",
             "--name-status", "-r", "-m", "--first-parent", "--no-renames", sha],
            capture_output=True, text=True, check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {a: commit.get(a, []) for a in ("added", "modified", "removed")}
    files = {"added": [], "modified": [], "removed": []}
    kinds = {"A": "added", "M": "modified", "T": "modified", "D": "removed"}
    for line in out.splitlines():
        status, _, path = line.partition("\t")
        if status[:1] in kinds and path:
            files[kinds[status[:1]]].append(path)
    print(f"  commit {sha[:7]}: git ve {sum(map(len, files.values()))} archivo(s): "
          + ", ".join(p for v in files.values() for p in v[:5]))
    return files


MAX_CONTENT_BYTES = 900_000  # Firestore limita cada documento a 1 MiB


def read_content(sha, path, action):
    """Contenido del archivo para guardarlo en el evento.

    added/modified: versión en el commit. removed: versión anterior (sha^), que es
    la que se perdió. Devuelve (contenido, estado, fuente) donde estado es
    ok | too_large | binary | unavailable.
    """
    if action == "removed":
        ref, source = f"{sha}^:{path}", "previous_commit"
    else:
        ref, source = f"{sha}:{path}", "commit"
    try:
        raw = subprocess.run(
            ["git", "show", ref], capture_output=True, check=True
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None, "unavailable", source
    if len(raw) > MAX_CONTENT_BYTES:
        return None, "too_large", source
    try:
        return raw.decode("utf-8"), "ok", source
    except UnicodeDecodeError:
        return None, "binary", source


def extract(payload, run_id):
    branch_filter = os.environ.get("WATCH_BRANCH", "master")
    prefix = os.environ.get("WATCH_PATH_PREFIX", "backend/src/config/clients/")
    actions = [
        a.strip()
        for a in os.environ.get("WATCH_ACTIONS", "added,modified,removed").split(",")
        if a.strip()
    ]
    repo = payload.get("repository", {}).get("full_name", "")
    branch = payload.get("ref", "").removeprefix("refs/heads/")
    if branch_filter and branch != branch_filter:
        return []

    pusher = payload.get("pusher", {}).get("name")
    received_at = datetime.now(timezone.utc)
    events = []
    for commit in payload.get("commits", []):
        sha = commit.get("id", "")
        files = changed_files(commit)
        for action in ("added", "modified", "removed"):
            if action not in actions:
                continue
            for path in files[action]:
                if not path.startswith(prefix):
                    continue
                content, content_status, content_source = read_content(
                    sha, path, action
                )
                events.append(
                    {
                        "_id": f"{repo}:{branch}:{sha}:{action}:{path}",
                        "delivery_id": run_id,
                        "repo": repo,
                        "branch": branch,
                        "path": path,
                        "file_name": path.rsplit("/", 1)[-1],
                        "action": action,
                        "commit_sha": sha,
                        "commit_message": commit.get("message"),
                        "commit_url": commit.get("url"),
                        "file_url": None
                        if action == "removed"
                        else f"https://github.com/{repo}/blob/{sha}/{path}",
                        "author": commit.get("author", {}).get("name"),
                        "pusher": pusher,
                        "content": content,
                        "content_status": content_status,
                        "content_source": content_source,
                        "committed_at": parse_ts(commit.get("timestamp")),
                        "received_at": received_at,
                    }
                )
    return events


def main():
    with open(os.environ["GITHUB_EVENT_PATH"]) as f:
        payload = json.load(f)
    ensure_full_history()
    events = extract(payload, os.environ.get("GITHUB_RUN_ID", "local"))
    print(f"Rama: {payload.get('ref')}  commits en el evento: {len(payload.get('commits', []))}")
    print(f"Archivos coincidentes: {len(events)}")

    if os.environ.get("DRY_RUN") == "1":
        for e in events:
            print(" ", e["action"], e["path"], e["content_status"], repr(e["content"])[:40])
        return

    from google.api_core.exceptions import AlreadyExists
    from google.cloud import firestore

    client = firestore.Client(
        project=os.environ.get("GCP_PROJECT") or None,
        database=os.environ.get("FIRESTORE_DATABASE", "(default)"),
    )
    col = client.collection(os.environ.get("FIRESTORE_COLLECTION", "file_events"))
    inserted = 0
    for e in events:
        data = {k: v for k, v in e.items() if k != "_id"}
        data["event_id"] = e["_id"]
        try:
            # ID = SHA-256 del _id (Firestore no admite "/"); create() falla si ya
            # existe, así que reejecutar el workflow no duplica documentos.
            col.document(hashlib.sha256(e["_id"].encode()).hexdigest()).create(data)
            inserted += 1
        except AlreadyExists:
            pass
    print(f"Nuevos: {inserted}")


if __name__ == "__main__":
    main()
