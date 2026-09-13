#!/usr/bin/env python3
"""Deploy dist/ to Firebase Hosting via the REST API — keyless.

Vendored from pzsurf/surfpoland (.github/scripts/deploy_hosting.py) and cut
down: this repo has one site, no rewrites and no Cloud Run behind it. It is a
COPY on purpose — the two repositories deploy independently, and a shared
script would be a dependency between things whose whole point is not to have
one. If the upload protocol ever changes, both change.

Keyless because the organisation blocks service-account keys
(constraints/iam.disableServiceAccountKeyCreation) and firebase-tools cannot
authenticate with a Workload Identity credential. So we talk to the Hosting API
with the WIF-minted OAuth token directly.

Flow (https://firebase.google.com/docs/hosting/api-deploy):
  1. create a version   2. populateFiles with each file's gzipped sha256
  3. upload what the server is missing   4. finalize   5. release to live

Env:
  ACCESS_TOKEN         OAuth token for an SA holding roles/firebasehosting.admin
  GOOGLE_CLOUD_PROJECT optional; sends X-Goog-User-Project, which USER
                       credentials need and service-account ones do not

BREAK GLASS — deploying by hand when Actions cannot run it. This happened on
2026-09-13: a run wedged in `queued` with no jobs, and cancel, force-cancel and
dispatch all failed on GitHub's side, so the only way to ship was locally.

    npm ci && npx astro build
    ACCESS_TOKEN="$(gcloud auth print-access-token)" \
      GOOGLE_CLOUD_PROJECT=pzsurf-platform python3 .github/scripts/deploy_hosting.py

`GOOGLE_CLOUD_PROJECT` is why that env var exists. A WIF-minted token belongs to
a service account and carries its own billing project, so CI never sets it; a
token from `gcloud auth print-access-token` belongs to a PERSON, and the Hosting
API refuses it with a 403 about a missing quota project unless the header says
which project to bill. Unset in CI, the header is simply not sent and nothing
changes there.
"""
import gzip
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://firebasehosting.googleapis.com/v1beta1"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOKEN = os.environ["ACCESS_TOKEN"]
# Only ever set for a hand-run deploy with user credentials — see the docstring.
QUOTA_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")


def _request(method, url, body=None, raw=False):
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    if QUOTA_PROJECT:
        req.add_header("X-Goog-User-Project", QUOTA_PROJECT)
    if raw:
        req.add_header("Content-Type", "application/octet-stream")
    elif body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            payload = resp.read()
        return json.loads(payload) if payload and not raw else None
    except urllib.error.HTTPError as exc:
        print(f"::error::{method} {url} -> HTTP {exc.code}\n{exc.read().decode(errors='replace')}",
              file=sys.stderr)
        raise


def main():
    with open(os.path.join(ROOT, "firebase.json")) as fh:
        hosting = json.load(fh)["hosting"]
    site = hosting["site"]
    public_dir = os.path.join(ROOT, hosting["public"])
    if not os.path.isdir(public_dir):
        sys.exit(f"Build output not found: {public_dir} — run `npm run build` first.")

    # Map "/site/path" -> gzipped bytes. mtime=0 so an unchanged file hashes the
    # same on every run and the server can skip its upload.
    files = {}
    for root, _dirs, names in os.walk(public_dir):
        for name in names:
            if name.startswith("."):
                continue
            abs_path = os.path.join(root, name)
            rel = os.path.relpath(abs_path, public_dir).replace(os.sep, "/")
            with open(abs_path, "rb") as fh:
                files["/" + rel] = gzip.compress(fh.read(), mtime=0)

    hashes = {path: hashlib.sha256(blob).hexdigest() for path, blob in files.items()}
    by_hash = {hashes[path]: blob for path, blob in files.items()}
    print(f"Deploying {len(files)} files to site '{site}'.")

    version = _request("POST", f"{API}/sites/{site}/versions", {"config": {}})
    version_name = version["name"]

    populate = _request("POST", f"{API}/{version_name}:populateFiles", {"files": hashes})
    required = populate.get("uploadRequiredHashes", []) or []
    upload_url = populate.get("uploadUrl", "")
    print(f"{len(required)} of {len(hashes)} files need uploading.")

    for i, file_hash in enumerate(required, 1):
        _request("POST", f"{upload_url}/{file_hash}", body=by_hash[file_hash], raw=True)
        if i % 10 == 0 or i == len(required):
            print(f"  uploaded {i}/{len(required)}")

    _request("PATCH", f"{API}/{version_name}?updateMask=status", {"status": "FINALIZED"})
    _request("POST", f"{API}/sites/{site}/releases?versionName={version_name}")
    print(f"✓ Released {version_name} to live.")


if __name__ == "__main__":
    main()
