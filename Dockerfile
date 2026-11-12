# syntax=docker/dockerfile:1.7
# Digital Maktab production image (Render service "digitalmaktab").
# Builds Core, the Afghanistan module, the API and the SPA from the sibling
# repos at the commits pinned in deploy/render/versions.env, then serves the
# SPA from the API host. See deploy/render/README.md.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git gnupg openssh-client \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY deploy/render/ deploy/render/
RUN --mount=type=secret,id=deploy_keys,dst=/etc/secrets/deploy_keys \
    bash deploy/render/fetch.sh /ws
RUN bash deploy/render/build.sh /ws /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
# The official wkhtmltox package supplies libwkhtmltox for the server-side PDF
# reports (DinkToPdf); Debian's own wkhtmltopdf package ships only the binary.
ARG WKHTMLTOX_VERSION=0.12.6.1-3
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl fontconfig fonts-dejavu-core \
 && arch="$(dpkg --print-architecture)" \
 && curl -fsSL -o /tmp/wkhtmltox.deb "https://github.com/wkhtmltopdf/packaging/releases/download/${WKHTMLTOX_VERSION}/wkhtmltox_${WKHTMLTOX_VERSION}.bookworm_${arch}.deb" \
 && apt-get install -y --no-install-recommends /tmp/wkhtmltox.deb \
 && rm -rf /tmp/wkhtmltox.deb /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/api/ /app/
COPY --from=build /out/bootstrap/ /opt/digitalmaktab-bootstrap/
COPY deploy/render/start.sh /usr/local/bin/digitalmaktab-start
RUN chmod +x /usr/local/bin/digitalmaktab-start \
 && lib="$(find /usr/local/lib /usr/lib -name 'libwkhtmltox.so*' | head -1)" \
 && [ -n "$lib" ] && ln -sf "$lib" /app/libwkhtmltox.so
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5000
ENTRYPOINT ["/usr/local/bin/digitalmaktab-start"]
