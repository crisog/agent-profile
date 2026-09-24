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

Structured fields, canonical log lines, sampling, and the split between logs and metrics follow the Observable section of `code-law`.

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

## 3. Performance

### `log-no-sensitive` - Never Log Sensitive Data

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
- Log to a separate disk partition
- Load test to catch logging bottlenecks early
