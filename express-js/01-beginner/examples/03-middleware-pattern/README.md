# 03 — Middleware Pattern

Custom logger + request-id + timing middleware chain

```bash
npm run beginner:middleware
curl -i http://localhost:3002/api/ping
curl -i -H "X-Request-Id: lab-trace-1" http://localhost:3002/api/echo -H "Content-Type: application/json" -d '{"msg":"hi"}'
```
