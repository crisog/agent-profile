---
name: logging-best-practices
description: Use when writing or reviewing log statements, choosing log levels, designing structured or canonical log lines, or deciding what a service emits to debug production.
---

# Logging Best Practices

What to log, how to structure it, and what it costs.

## 1. Strategy

### `log-objectives` - Define Logging Goals First

Don't throw log statements everywhere hoping something useful sticks. Before writing logs, answer:
- What are the application's main goals?
- What critical operations need monitoring?
- What KPIs actually matter?

**Tip:** Start by over-logging, then trim back. It's easier to remove noise than add missing info in production.

### `log-levels` - Use Appropriate Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| INFO | Normal operations, business events | `User completed checkout, orderId=12345` |
| WARNING | Early warning, degraded but functional | `Payment processing taking longer than usual` |
| ERROR | Real problems requiring attention | `Database connection failed` |
| FATAL | System crash, immediate shutdown | `System out of memory, shutting down` |

**Production default:** INFO level. Have a mechanism to temporarily increase verbosity for debugging.

## 2. Structure

### `log-structured` - Use Structured Logging

Bad (unstructured):
```
2024-03-22 14:15:32 ERROR Payment failed for customer acct_8472 amount $149.99
```

Good (structured JSON):
```json
{
  "timestamp": "2024-03-22T14:15:32Z",
  "level": "error",
  "event": "payment_failed",
  "customerId": "acct_8472",
  "amount": 149.99,
  "currency": "USD",
  "gateway": "stripe",
  "errorCode": "card_declined"
}
```

Structured logs enable filtering, searching, and analysis. Use logging frameworks that support this natively.

### `log-context` - Include Sufficient Context

Every log entry should answer who, what, where, and why:

- **Request IDs** - For tracing across microservices
- **User IDs** - For session context (when appropriate)
- **System state** - Database/cache status
- **Error context** - Stack traces when relevant

Bad:
```
Something went wrong
```

Good:
```json
{
  "event": "order_creation_failed",
  "requestId": "req_7f3a9c2b",
  "userId": "usr_5521",
  "cartItems": 4,
  "failedAt": "inventory_check",
  "reason": "insufficient_stock",
  "skuUnavailable": "PROD-2847"
}
```

### `log-canonical` - Use Canonical Log Lines

Instead of logging events as they happen (scattered entries), create one comprehensive log entry per request that captures the entire story:

```json
{
  "requestId": "req_e4f8b21a",
  "userId": "usr_9032",
  "endpoint": "POST /api/v1/subscriptions",
  "status": 201,
  "durationMs": 187,
  "dbTimeMs": 62,
  "cacheHit": true,
  "planType": "pro"
}
```

**Better alternative:** Use distributed tracing (OpenTelemetry) to link spans across services while preserving individual steps.

## 3. Performance

### `log-sampling` - Implement Log Sampling

For high-traffic systems generating terabytes of logs:

- Store a representative sample instead of everything
- Be selective: keep all errors, sample successes
- Sample more aggressively on high-traffic endpoints
- Keep full logs for critical paths

**Result:** Can reduce logging costs by 80%+ while maintaining insights.

### `log-no-sensitive` - Never Log Sensitive Data

Twitter and GitHub both accidentally logged passwords. Don't be next.

Never log:
- Passwords (plain or hashed)
- API keys and secrets
- Credit card numbers
- Social Security numbers
- PII without explicit need

**Implementation:**
```go
// Use custom types that redact on marshal
type User struct {
    ID       string `json:"id"`
    Password string `json:"-"` // Never serialized
}
```

Set up filters in your logging pipeline to catch and redact sensitive patterns before storage.

### `log-performance` - Minimize Logging Overhead

Logging costs CPU cycles and memory:

- Choose efficient logging libraries (e.g., Go's slog over logrus)
- Use sampling in high-traffic paths
- Log to a separate disk partition
- Load test to catch logging bottlenecks early

**Example impact:** Basic logging can cause 20% performance drop; optimized libraries reduce this to ~3%.

### `log-vs-metrics` - Use the Right Tool

| Logs | Metrics |
|------|---------|
| Tell you what happened | Tell you how often things happen |
| Good for debugging | Good for real-time monitoring |
| After-the-fact analysis | Trend detection and alerting |

**Use logs** to debug problems.
**Use metrics** to know when you have a problem.

Don't grep through logs to answer "is my service healthy right now?" - that's what metrics are for.
