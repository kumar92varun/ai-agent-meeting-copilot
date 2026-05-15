# Installation Guide

Complete local and production setup from zero — no prior knowledge assumed.

---

## Prerequisites

A machine running Ubuntu 24.04 (or macOS for local dev). Production target is a DigitalOcean Droplet (2 vCPU / 4 GB RAM minimum).

---

## 1 — Node.js 20 LTS via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc          # or ~/.zshrc

nvm install 20
nvm use 20
nvm alias default 20
node --version            # should print v20.x.x
```

## 2 — pnpm

```bash
npm install -g pnpm
pnpm --version            # should print 9.x or later
```

## 3 — PostgreSQL 16 + pgvector

```bash
# Ubuntu 24.04
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<'SQL'
CREATE USER standup WITH PASSWORD 'changeme';
CREATE DATABASE standup_intel OWNER standup;
GRANT ALL PRIVILEGES ON DATABASE standup_intel TO standup;
SQL

# Install pgvector extension
sudo apt install -y postgresql-16-pgvector

# Enable extension (run as the standup user or postgres superuser)
sudo -u postgres psql -d standup_intel -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Verify:
```bash
sudo -u postgres psql -d standup_intel -c "\dx"
# Should list 'vector' in the extensions list
```

## 4 — Redis 7

```bash
sudo apt install -y redis-server

sudo systemctl start redis-server
sudo systemctl enable redis-server

redis-cli ping   # should return PONG
```

## 5 — Clone and install dependencies

```bash
git clone <your-repo-url> crownstack-standup-intelligence
cd crownstack-standup-intelligence
pnpm install
```

## 6 — Environment variables

```bash
cp .env.example .env
nano .env          # fill in all values
```

### Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use existing)
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
4. Application type: **Web application**
5. Authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/google`
   - Production: `https://yourdomain.com/api/auth/google`
6. Copy Client ID and Client Secret to `.env`

## 7 — Database migrations

```bash
# Generate migrations from schema
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Create the bootstrap admin user
pnpm db:seed
```

## 8 — Local development

Open two terminals:

**Terminal 1 — Nuxt dev server:**
```bash
pnpm dev
# App available at http://localhost:3000
```

**Terminal 2 — BullMQ worker:**
```bash
pnpm worker:dev
```

Visit `http://localhost:3000` and sign in with your Crownstack Google account.

---

## Production deployment (DigitalOcean Droplet)

### Additional packages

```bash
# Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2
npm install -g pm2
```

### Build the app

```bash
pnpm install --frozen-lockfile
pnpm build
```

### Nginx configuration

Create `/etc/nginx/sites-available/standup-intel`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Required for SSE (standup analyze endpoint)
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/standup-intel /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d yourdomain.com
```

### PM2 process management

```bash
# Create PM2 log directory
sudo mkdir -p /var/log/pm2

# Start processes
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup     # follow the printed command to auto-start on reboot
```

Check status:
```bash
pm2 status
pm2 logs standup-intel-web
pm2 logs standup-intel-worker
```

### Deploy updates

```bash
git pull
pnpm install --frozen-lockfile
pnpm db:migrate          # apply any new migrations
pnpm build
pm2 reload ecosystem.config.cjs
```

---

## Verifying the installation

1. `GET https://yourdomain.com/api/health` — should return `{ "status": "ok", "checks": { "db": true, "redis": true } }`
2. Visit the app URL and sign in with a Crownstack Google account
3. Go to **Admin → Projects** and create your first project
4. Go to **Admin → Resources** and add team members
5. Go to **Admin → Mappings** and assign resources to the project
6. Go to **Standups → New Standup**, paste a transcript, and run an analysis

---

## LLM provider swap

To switch from OpenAI to Anthropic:

```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
LLM_API_KEY=<your-anthropic-key>
# Keep EMBEDDING_PROVIDER=openai — Anthropic has no embeddings API
```

Restart the Nuxt process: `pm2 reload standup-intel-web`

The startup log will confirm: `LLM provider: anthropic / model: claude-sonnet-4-6`

---

## Debugging LLM extraction

Every LLM call is logged to the `llm_call_logs` table. To inspect any call:

```bash
pnpm inspect-llm-log -- <log-id>
```

This prints the exact prompt, response, token counts, and cost — essential for debugging Hinglish extraction edge cases.
