#!/usr/bin/env bash
# Reviewed preparation for a NEW Ubuntu 24.04 VM. Not executed in this workspace.
set -euo pipefail
if [[ $EUID -ne 0 || $# -ne 3 ]]; then
  echo "Usage: sudo bash bootstrap-free-vm.sh <source.tar.gz> <app-hostname> <preview-hostname>" >&2
  exit 1
fi
archive=$(realpath "$1")
app_hostname=${2,,}
preview_hostname=${3,,}
if [[ ! -f "${archive}.sha256" ]]; then echo "The matching source archive checksum file is required." >&2; exit 1; fi
read -r expected_hash expected_name < "${archive}.sha256"
if [[ ! "$expected_hash" =~ ^[a-f0-9]{64}$ || "$expected_name" != "$(basename "$archive")" || "$(sha256sum "$archive" | cut -d ' ' -f 1)" != "$expected_hash" ]]; then
  echo "Source archive checksum mismatch." >&2; exit 1
fi
for hostname in "$app_hostname" "$preview_hostname"; do
  if [[ ! "$hostname" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ || "$hostname" != *.* || "$hostname" == *.example ]]; then
    echo "Provide real DNS hostnames without schemes, ports or paths." >&2; exit 1
  fi
done
if [[ "$app_hostname" == "$preview_hostname" || -e /opt/nexyral || -e /etc/caddy/Caddyfile ]]; then
  echo "Use distinct hosts on a fresh VM. Existing application/proxy files will not be overwritten." >&2; exit 1
fi
if ! command -v python3 >/dev/null; then echo "Ubuntu python3 is required for archive validation." >&2; exit 1; fi
python3 - "$archive" <<'PY'
import sys, tarfile, pathlib
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    for member in archive.getmembers():
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'nexyral' or not (member.isfile() or member.isdir()):
            raise SystemExit('Unsafe deployment archive entry')
PY
if command -v node >/dev/null && [[ $(node --version) != v24.19.0 ]]; then
  echo "An existing Node installation will not be replaced. Use a fresh VM or review toolchain setup separately." >&2; exit 1
fi
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl xz-utils caddy
if ! command -v node >/dev/null; then
  case $(uname -m) in aarch64) node_arch=arm64 ;; x86_64) node_arch=x64 ;; *) echo "Unsupported CPU architecture" >&2; exit 1 ;; esac
  node_archive="node-v24.19.0-linux-${node_arch}.tar.xz"
  task_tmp=$(mktemp -d)
  trap 'rm -rf "$task_tmp"' EXIT
  curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/v24.19.0/${node_archive}" -o "$task_tmp/$node_archive"
  curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/v24.19.0/SHASUMS256.txt" -o "$task_tmp/SHASUMS256.txt"
  (cd "$task_tmp"; awk -v target="$node_archive" '$2 == target {print}' SHASUMS256.txt > selected.sha256; test -s selected.sha256; sha256sum -c selected.sha256)
  install -d /usr/local/lib/nexyral-node
  tar -xJf "$task_tmp/$node_archive" -C /usr/local/lib/nexyral-node --strip-components=1
  ln -s /usr/local/lib/nexyral-node/bin/node /usr/local/bin/node
  ln -s /usr/local/lib/nexyral-node/bin/npm /usr/local/bin/npm
fi
id nexyral >/dev/null 2>&1 || useradd --system --home-dir /opt/nexyral --shell /usr/sbin/nologin nexyral
install -d -o nexyral -g nexyral /opt/nexyral/app
# The archive was checked for traversal and links before extracting.
tar -xzf "$archive" -C /opt/nexyral/app --strip-components=1
chown -R nexyral:nexyral /opt/nexyral
install -d -m 700 -o nexyral -g nexyral /opt/nexyral/app/.data
runuser -u nexyral -- sh -c 'cd /opt/nexyral/app && npm ci --cache /opt/nexyral/.npm && npm run lint && npm run build'
install -d -m 700 /etc/nexyral
cat > /etc/nexyral/backend.env <<ENV
NODE_ENV=production
PATH=/usr/local/bin:/usr/bin:/bin
NEXYRAL_APP_HOST=$app_hostname
NEXYRAL_PREVIEW_HOSTNAME=$preview_hostname
NEXYRAL_APP_ORIGINS=https://$app_hostname
NEXYRAL_PREVIEW_ORIGIN=https://$preview_hostname
NEXYRAL_RECOVERY_APP_ORIGIN=https://$app_hostname
NEXYRAL_DB_PATH=/opt/nexyral/app/.data/workspace.sqlite
NEXYRAL_TRUSTED_PROXIES=127.0.0.1
NEXYRAL_START_WORKER=0
NEXYRAL_ENABLE_BUILDS=0
ENV
chmod 600 /etc/nexyral/backend.env
cat > /etc/systemd/system/nexyral.service <<'UNIT'
[Unit]
Description=NEXYRAL workspace and isolated preview
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=nexyral
Group=nexyral
WorkingDirectory=/opt/nexyral/app
EnvironmentFile=/etc/nexyral/backend.env
ExecStart=/usr/bin/env node scripts/services.ts serve
Restart=no
KillMode=control-group
TimeoutStopSec=10
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/nexyral/app/.data
[Install]
WantedBy=multi-user.target
UNIT
install -m 644 /opt/nexyral/app/deploy/Caddyfile /etc/caddy/Caddyfile
install -d /etc/systemd/system/caddy.service.d
printf '[Service]\nEnvironmentFile=/etc/nexyral/backend.env\n' > /etc/systemd/system/caddy.service.d/nexyral.conf
NEXYRAL_APP_HOST=$app_hostname NEXYRAL_PREVIEW_HOSTNAME=$preview_hostname caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl daemon-reload
systemctl enable --now nexyral
systemctl restart caddy
echo "Services started. Verify actual public HTTPS, accounts and backup/restore before accepting users. Model/build worker remains disabled."
