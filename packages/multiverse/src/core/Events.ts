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

    // instances involved ?
};

export type AddEvent = BaseEvent & {
    type: "add";
    vectorsAfter: number;
    count: number;
};

export type RemoveEvent = BaseEvent & {
    type: "remove";
    vectorsAfter: number;
    count: number;
};

export type Event = QueryEvent | AddEvent | RemoveEvent;