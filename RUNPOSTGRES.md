# Running Docker Containers on macOS

macOS can't run Linux containers natively since Docker relies on Linux kernel features (namespaces, cgroups). Every Docker solution on macOS runs a lightweight Linux VM behind the scenes.

## Option 1: Docker Desktop

Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and drag it to Applications. Open it and let it finish setup — it provisions the Linux VM automatically.

### Verify installation

```bash
docker --version
docker run hello-world
```

## Using Docker Compose (current setup)

Our `docker-compose.yaml` reads database credentials from a `.env` file in the project root. Docker Compose loads `.env` automatically — no extra flags needed.

### `.env` file format

```env
POSTGRES_USER=oops_db
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=rx_formulary

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?schema=public"
```

> **Note:** The `.env` file is listed in `.gitignore` and should never be committed. Each developer must create their own copy locally.

### Running the containers

```bash
docker compose up -d      # start all services
docker compose down        # stop and remove all services
docker compose logs -f     # follow logs for all services
```

## More Lightweight to Run a Container

```bash
docker run --name oops_postgres \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  -d postgres
```

### Connecting to Postgres

```bash
psql -h localhost -U postgres -d postgres
```