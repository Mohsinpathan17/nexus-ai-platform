"""Import pinned official model files through HTTPS when native pull DNS is unavailable."""
import hashlib
import json
import subprocess
import shutil
import tempfile
from pathlib import Path

ROOT = Path("/workspace/tools/ollama")
REGISTRY = "https://registry.ollama.ai/v2/library/qwen2.5-coder"
MANIFEST_SHA256 = "d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668"


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def download(url, path):
    subprocess.run([
        "curl", "--fail", "--location", "--silent", "--show-error",
        "--proto", "=https", "--proto-redir", "=https", "--max-time", "600",
        url, "-o", str(path),
    ], check=True)


with tempfile.TemporaryDirectory(prefix="nexyral-model-", dir="/tmp") as temporary:
    directory = Path(temporary)
    manifest_path = directory / "manifest.json"
    download(REGISTRY + "/manifests/1.5b", manifest_path)
    if digest(manifest_path) != MANIFEST_SHA256:
        raise RuntimeError("Official manifest changed; review it before updating the pin.")
    manifest = json.loads(manifest_path.read_text())
    # Reuse a retained import source only after checking its exact official digest.
    retained = ROOT / "import-source"
    retained.mkdir(parents=True, exist_ok=True)
    sections = {}
    for layer in manifest["layers"]:
        expected = layer["digest"].removeprefix("sha256:")
        if len(expected) != 64 or any(char not in "0123456789abcdef" for char in expected):
            raise RuntimeError("Invalid layer digest")
        path = retained / expected
        if not path.exists() or path.stat().st_size != layer["size"] or digest(path) != expected:
            partial = directory / expected
            download(REGISTRY + "/blobs/" + layer["digest"], partial)
            if partial.stat().st_size != layer["size"] or digest(partial) != expected:
                raise RuntimeError("Official model layer integrity check failed")
            shutil.copyfile(partial, path)
        sections[layer["mediaType"].split(".")[-1]] = path
    parts = ["FROM " + str(sections["model"])]
    for section in ("template", "system", "license"):
        parts.append(section.upper() + ' """' + sections[section].read_text() + '"""')
    parts.extend(['PARAMETER stop "<|im_end|>"', 'PARAMETER stop "<|endoftext|>"'])
    modelfile = directory / "Modelfile"
    modelfile.write_text("\n".join(parts) + "\n")
    subprocess.run([str(ROOT / "bin/ollama"), "create", "qwen2.5-coder:1.5b", "-f", str(modelfile)], check=True)
    print("Official model layers verified and imported into the local Ollama service.")
