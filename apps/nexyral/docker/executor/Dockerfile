FROM node:24.19.0-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
LABEL org.nexyral.executor.version="1" org.nexyral.executor.bundled-browser="true"
COPY build-ca.crt /tmp/nexyral-build-ca.crt
RUN chmod 644 /tmp/nexyral-build-ca.crt \
    && sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::https::CaInfo=/tmp/nexyral-build-ca.crt -o APT::Update::Error-Mode=any update \
    && apt-get -o Acquire::https::CaInfo=/tmp/nexyral-build-ca.crt install -y --no-install-recommends chromium fonts-liberation \
    && rm -rf /var/lib/apt/lists/* /tmp/nexyral-build-ca.crt
USER node
WORKDIR /work
CMD ["node"]
