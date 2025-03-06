# Log

Example usage: 
```typescript
import log from "@multiverse/log";

log.debug({
    message: "This is a debug message",
    data: {
        some: "data"
    }
});
```

Usage of this package instead of `console.log` is recommended. It will log the message in a human-readable way and will include the timestamp and the log level. Also for different environments (like production) it will log the message in a different way.