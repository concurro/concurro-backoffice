# The backoffice web app: the static build behind Caddy, run unprivileged. The edge strips the
# `/concurro` base path and sends everything except `/api` and `/auth` here.
FROM node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check && npm run build

FROM caddy:2.11.6@sha256:3422ce6de165df66534f9b9ba50efaf457114ec961763cc52f5dbdaac2972d73
# Port 8080 needs no bind capability, and a file capability stops the binary starting under
# `no-new-privileges`.
RUN setcap -r /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
USER 65532:65532
EXPOSE 8080
