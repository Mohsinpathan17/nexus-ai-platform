# Free hosting path for the current platform

A free Linux VM fits this architecture better than a static/serverless function:
accounts need persistent SQLite storage, and full engineering workers need local
Ollama and a Docker daemon. Oracle Cloud's Always Free eligible VM offering is a
candidate, subject to account eligibility, regional capacity, provider terms and
possible identity/payment-method verification. No VM or paid resource has been
created. Current provider pricing could not be fetched here because the cloud
proxy rejected oracle.com (HTTP403); confirm the Always Free marker and zero
estimated cost in the provider console before creating resources. Do not treat
trial credits or an arbitrary compute shape as a permanent free plan.

1. Open https://www.oracle.com/cloud/free/ and choose only Always Free eligible
   resources if offered to your account. Use a fresh Ubuntu24.04 VM. The source
   installer supports x64/ARM64; a sufficiently provisioned eligible ARM VM is
   the preferred full-worker path when capacity is available. Preserve private
   SSH access and avoid changing other existing servers.
2. Configure a public IP and inbound TCP80/443 in the cloud network and OS
   firewall. Restrict SSH access appropriately. Do not expose ports8787/8788 or
   the Docker socket. Set two real DNS hostnames, app and preview, to that IP.
   An existing owned domain is suitable. An IP-based DNS service such as
   sslip.io may provide a no-purchase alternative (`app.<IP>.sslip.io` and
   `preview.<IP>.sslip.io`); verify actual DNS resolution and certificate
   availability. That third-party service is not provisioned or guaranteed here.
3. Download `artifacts/nexyral-backend-source.tar.gz`, its `.sha256` file and
   `deploy/bootstrap-free-vm.sh` from this workspace, then transfer them to the
   new VM over a verified SSH connection. The archive contains allowlisted
   source/configuration/tests, not `.data`, credentials, models, execution
   outputs, dependency caches or Git authentication. Keep the filenames.
4. On the NEW VM, review the script and run:

   ```sh
   sha256sum -c nexyral-backend-source.tar.gz.sha256
   sudo bash bootstrap-free-vm.sh nexyral-backend-source.tar.gz app.your-domain.com preview.your-domain.com
   ```

   It refuses existing application/proxy paths, validates archive paths/checksum,
   installs signed Ubuntu packages, verifies Node24.19 download against official
   HTTPS checksum metadata, performs `npm ci`, lint and the ordinary build,
   creates an unprivileged service user, private database storage and a systemd
   service, and configures Caddy for the two hosts. It does not overwrite an
   existing Node version. Systemd starts API/static workspace and separate
   previews only; worker/build execution remains disabled. This provisioning
   script was syntax-checked but has NOT been executed on an actual Oracle VM.
   It requires root on a fresh VM and relies on real DNS/network/certificate
   prerequisites; package installation, ARM build and certificate issuance have
   not been verified remotely. `Restart=no` avoids unattended worker/run restart.
5. Run the anonymous HTTPS checks from the extracted app directory:

   ```sh
   npm run smoke:https -- https://app.your-domain.com https://preview.your-domain.com
   ```

   All eight checks must pass. Then verify signup/login, project persistence, cross-owner
   protections, recovery, separate-origin previews and a protected off-machine
   backup/restore before inviting users. See BACKEND_HOSTING.md and RECOVERY.md.
   Configure a local model and Docker worker separately after reviewing queues.
   Docker is intentionally not installed or granted to the API user by this
   initial accounts/UI installer. Full-worker isolation and image provisioning
   require a separate setup step. The installer configures a controlled local
   trusted proxy for per-client authentication/recovery limits; compiled startup
   now runs deployment preflight. Real HTTPS routing and remote behavior still
   need verification on the VM. See HTTPS_VALIDATION.md for the complete launch
   checklist and BACKEND_HOSTING.md for proxy assumptions.

The archive checksum detects corruption, not authenticity; obtain archive,
checksum and installer from this trusted workspace. Source-package builds were
checked in a clean extracted directory in this cloud environment. This is not
proof of remote provisioning or a guarantee of continuous free VM availability.
Do not paste cloud credentials, private SSH keys or recovery links into chat.
The existing Vercel public demo remains available while the backend is prepared.
