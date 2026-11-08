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
    return files


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
                        "committed_at": parse_ts(commit.get("timestamp")),
                        "received_at": received_at,
                    }
                )
    return events


def main():
    with open(os.environ["GITHUB_EVENT_PATH"]) as f:
        payload = json.load(f)
    events = extract(payload, os.environ.get("GITHUB_RUN_ID", "local"))
    print(f"Rama: {payload.get('ref')}  commits en el evento: {len(payload.get('commits', []))}")
    print(f"Archivos coincidentes: {len(events)}")

    if os.environ.get("DRY_RUN") == "1":
        for e in events:
            print(" ", e["action"], e["path"])
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
