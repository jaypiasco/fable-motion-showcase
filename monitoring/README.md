# Local pipeline monitoring

The API exposes Prometheus metrics at `/metrics`. Start the optional local
stack with `docker compose -f monitoring/docker-compose.yml up`; Prometheus
scrapes the API on `host.docker.internal:8000` and Grafana is available on
port 3000 with the dashboard provisioned automatically. Docker is not
required to run the pipeline or its tests.
