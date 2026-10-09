#!/usr/bin/env bash
# Run on the NEW EC2 host, through Session Manager. Does not create AWS resources.
set -euo pipefail
if [[ $EUID -ne 0 || $# -ne 5 ]]; then
  echo "Usage: sudo bash install-release.sh <region> <private-bucket> <prefix> <app-host> <preview-host>" >&2
  exit 1
fi
region=$1
bucket=$2
prefix=$3
if [[ ! $region =~ ^[a-z]{2}(-[a-z]+)+-[0-9]+$ || ! $bucket =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ || ! $prefix =~ ^[A-Za-z0-9][A-Za-z0-9/_-]{0,100}$ || $prefix == */ ]]; then
  echo "Invalid region, bucket or prefix." >&2; exit 1
fi
if [[ -e /opt/nexyral || -e /etc/caddy/Caddyfile ]]; then
  echo "A fresh host is required; existing application files will not be replaced." >&2; exit 1
fi
if ! command -v aws >/dev/null; then echo "Install the AWS CLI using signed Ubuntu packages before running this helper." >&2; exit 1; fi
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
for name in nexyral-backend-source.tar.gz nexyral-backend-source.tar.gz.sha256 bootstrap-free-vm.sh; do
  aws --region "$region" s3 cp "s3://$bucket/$prefix/$name" "$work/$name" --only-show-errors
done
# The existing bootstrap validates checksum, safe archive entries and DNS names.
bash "$work/bootstrap-free-vm.sh" "$work/nexyral-backend-source.tar.gz" "$4" "$5"
