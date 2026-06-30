# Infra — serviços de apoio

`docker-compose.yml` sobe os serviços de dados para desenvolvimento.

```bash
docker compose -f infra/docker-compose.yml up -d            # postgis + redis
```

- **postgis** (`mapeando_admin` superuser; cria o role de app `mapeando`
  NOSUPERUSER/NOBYPASSRLS via `db/init/01-init.sql`).
- **redis** — cache/filas.

## OSRM (rota e TSP) — perfil `osrm`

OSRM precisa de um extract pré-processado. Uma vez:

```bash
mkdir -p infra/osrm && cd infra/osrm
curl -O https://download.geofabrik.de/south-america/brazil-latest.osm.pbf
docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/brazil-latest.osm.pbf
docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-partition /data/brazil-latest.osrm
docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-customize /data/brazil-latest.osrm
cd ../.. && docker compose -f infra/docker-compose.yml --profile osrm up -d
```

> Sem OSRM, o planejador usa um fallback (vizinho-mais-próximo + Haversine) —
> o app continua funcionando, com rota aproximada.

## Nominatim (geocodificação self-hosted) — perfil `nominatim`

```bash
docker compose -f infra/docker-compose.yml --profile nominatim up -d
# depois aponte NOMINATIM_URL=http://localhost:8080 no .env
```

Remove o limite de 1 req/s do Nominatim público (a importação do Brasil leva
horas na primeira vez).

## Dados

- `data/municipios.csv` — gazetteer IBGE (5.570 municípios com lat/lng), usado no
  geocode Fase 0 (centróide por município). Versionado no repo.
