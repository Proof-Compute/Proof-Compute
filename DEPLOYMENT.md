# Proof Compute — Configuration & Deployment

## Environment Setup

### System Requirements

```
Node.js:  ≥ 20.0.0
Memory:   ≥ 512MB for typical usage
Storage:  ≥ 1GB for production store
Network:  HTTP/1.1 capable
OS:       Linux, macOS, Windows (WSL2 recommended)
```

### Install

```bash
# From npm (recommended)
npm install proof-compute

# Or clone repository
git clone https://github.com/your-org/proof-compute
cd proof-compute
npm install
```

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with file watcher
npm run dev

# Generate documentation
npm run docs
```

## Running the Service

### Basic

```bash
# Port 8787 (default)
npm start

# With custom port
npm start -- --port=9000

# With custom storage
npm start -- --store=/var/proof-compute-store
```

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src src

EXPOSE 8787

CMD ["npm", "start"]
```

```bash
# Build image
docker build -t proof-compute:latest .

# Run container
docker run -p 8787:8787 \
  -v proof-compute-store:/app/.proof-compute \
  proof-compute:latest
```

### Systemd Service (Linux)

```ini
# /etc/systemd/system/proof-compute.service

[Unit]
Description=Proof Compute Compute Service
After=network.target

[Service]
Type=simple
User=proof-compute
WorkingDirectory=/opt/proof-compute
ExecStart=/usr/bin/node /opt/proof-compute/src/cli.js serve --port 8787 --store /var/lib/proof-compute/store
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable proof-compute
sudo systemctl start proof-compute
sudo systemctl status proof-compute

# View logs
sudo journalctl -u proof-compute -f
```

## Storage Configuration

### Filesystem (Default)

```
.proof-compute/
├── flows/
│   ├── abc123....json
│   └── ...
├── proofs/
│   ├── def456....json
│   └── ...
└── executions/
    ├── ghi789....json
    └── ...
```

**Good for:** Development, small deployments, on-disk persistence

**Configuration:**
```bash
npm start -- --store=/path/to/storage
```

### SQL Database (Production)

For high-scale deployments, replace filesystem with SQL:

```sql
CREATE TABLE flows (
  cid TEXT PRIMARY KEY,
  definition JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE proofs (
  cid TEXT PRIMARY KEY,
  proof JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE executions (
  input_cid TEXT PRIMARY KEY,
  output_cid TEXT,
  dag_root_cid TEXT,
  dag_size INTEGER,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation:** Extend `Store` class in `src/node/store.js`

### Key-Value Store (High Performance)

For ultra-high-throughput, use Redis or similar:

```javascript
// src/node/store-redis.js
class RedisStore {
  async saveFlow(flow) {
    const cid = cidOf(flow);
    await redis.set(`flow:${cid}`, JSON.stringify(flow));
    return cid;
  }
  // ... implement other methods
}
```

## Security Configuration

### Network

```bash
# Behind reverse proxy (recommended)
# Nginx example:

server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://localhost:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Rate limiting
        limit_req zone=general burst=100 nodelay;
    }
    
    # HTTPS/TLS
    listen 443 ssl;
    ssl_certificate /etc/ssl/certs/api.crt;
    ssl_certificate_key /etc/ssl/private/api.key;
}
```

### API Authentication (Optional)

Add middleware for token validation:

```javascript
// src/node/auth.js
function validateToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return false;
  }
  
  const token = auth.slice(7);
  // Verify token (HMAC, JWT, etc.)
  return verifyToken(token);
}
```

### CORS Policy

```javascript
// Restrict to specific origins
const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://api.example.com'
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
}
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:8787/info
```

Expected response:
```json
{
  "ok": true,
  "node": "proof-compute",
  "version": "1.0.0"
}
```

### Logging

Enable structured logging:

```javascript
// src/node/logger.js
class Logger {
  info(msg, data) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: msg,
      data
    }));
  }
  
  error(msg, err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: msg,
      error: {
        code: err.code,
        category: err.category,
        message: err.message,
        stack: err.stack
      }
    }));
  }
}
```

### Metrics

Track execution performance:

```javascript
// src/node/metrics.js
const metrics = {
  executions: 0,
  errors: 0,
  avgExecutionTime: 0,
  totalEvents: 0
};

function recordExecution(result, duration) {
  metrics.executions++;
  metrics.totalEvents += result.dag.length - 1;
  metrics.avgExecutionTime = 
    (metrics.avgExecutionTime * (metrics.executions - 1) + duration) 
    / metrics.executions;
}
```

## Performance Tuning

### Event Batch Size

For large flows, batch event processing:

```javascript
// Process events in chunks to reduce GC pauses
const BATCH_SIZE = 100;

for (let i = 0; i < flow.events.length; i += BATCH_SIZE) {
  const batch = flow.events.slice(i, i + BATCH_SIZE);
  // Process batch
}
```

### Memory Management

```javascript
// Monitor heap usage
console.log('Memory:', process.memoryUsage());

// Set max listeners (prevents leaks)
process.setMaxListeners(10);
```

### Concurrency

```bash
# Run multiple server instances behind load balancer
proof serve --port 8787 &
proof serve --port 8788 &
proof serve --port 8789 &

# Nginx upstream:
upstream proof {
  server localhost:8787;
  server localhost:8788;
  server localhost:8789;
}
```

## Troubleshooting

### "Port Already in Use"

```bash
# Find process on port 8787
lsof -i :8787

# Kill process (be careful!)
kill -9 <PID>

# Use different port
npm start -- --port 9000
```

### "Store Directory Not Writable"

```bash
# Check permissions
ls -la .proof-compute

# Fix permissions
chmod 755 .proof-compute
chmod 755 .proof-compute/{flows,proofs,executions}
```

### "Reducer Not Found"

```bash
# Check available reducers
curl http://localhost:8787/info | jq .

# Ensure reducer is registered before lock
# Edit src/kernel/index.js
```

### High Memory Usage

```bash
# Check memory usage
npm start -- --store /tmp/proof-compute-test

# Implement periodic cleanup (in production)
// Remove old executions after N days
const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
```

### Slow Execution

```bash
# Profile with Node.js profiler
node --prof src/cli.js serve

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

## Backup & Recovery

### Backup Strategy

```bash
# Daily backup
0 2 * * * tar -czf /backup/proof-compute-$(date +%Y%m%d).tar.gz .proof-compute/

# Store remotely (S3, GCS, etc.)
# gsutil -m cp /backup/proof-compute-*.tar.gz gs://backup-bucket/
```

### Recovery

```bash
# Restore from backup
tar -xzf /backup/proof-compute-20250503.tar.gz -C /
systemctl restart proof-compute

# Verify
curl http://localhost:8787/info
```

## Upgrade Path

```bash
# Stop service
systemctl stop proof-compute

# Backup current
cp -r .proof-compute .proof-compute.backup

# Update code
npm update

# Run tests
npm test

# Start service
systemctl start proof-compute

# Verify
curl http://localhost:8787/info
```

## Production Checklist

- [ ] Node.js ≥ 20.0.0
- [ ] Storage with proper backups
- [ ] HTTPS/TLS enabled
- [ ] Rate limiting configured
- [ ] Monitoring in place
- [ ] Error alerting configured
- [ ] Logging to centralized sink
- [ ] Health checks in place
- [ ] Load balancer configured
- [ ] Graceful shutdown implemented
- [ ] Security headers set
- [ ] CORS properly restricted
- [ ] Database credentials not in code
- [ ] Resource limits set (ulimits)
- [ ] Log retention policy
- [ ] Disaster recovery tested

---

**Proof Compute is production-ready.** Deploy with confidence.
