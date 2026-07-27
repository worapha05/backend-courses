# 04 — Cluster + Health Checks

Primary forks workers; each serves Express with live/ready probes

```bash
WEB_CONCURRENCY=2 npm run expert:cluster
# PORT 3043
curl localhost:3043/health/live
curl localhost:3043/health/ready
curl localhost:3043/api/whoami
```

## PM2 (ทางเลือกบน VM)

```bash
npx pm2 start 03-expert/examples/04-clustering-health/src/app.js -i max --name express-bootcamp
npx pm2 reload express-bootcamp
```
