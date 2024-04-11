/**
 * Statistics events
 */

export type BaseEvent = {
    timestamp: number;
    dbName: string;
};

export type QueryEvent = BaseEvent & {
    type: "query";
    query: string;
    duration: number;
};

export type AddEvent = BaseEvent & {
    type: "add";
    totalVectors: number;
};

export type RemoveEvent = BaseEvent & {
    type: "remove";
    totalVectors: number;
};

export type Event = QueryEvent | AddEvent | RemoveEvent;