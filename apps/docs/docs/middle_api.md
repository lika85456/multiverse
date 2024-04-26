---
sidebar_position: 3
---


# API

## Statistics event
Is sent to SQS for major events like reads, writes, and deletes. 
```typescript
export type EventType = {
    type: "knn",
    queryTime: number,
} | {
    type: "insert",
    amount: number,
} | {
    type: "delete",
    amount: number,
};
```