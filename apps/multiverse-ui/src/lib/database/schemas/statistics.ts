import type { Timestamp } from "mongodb";

export interface DatabaseStatistics {
  hourlyStatistics: {
    time: Timestamp;
    value: number;
  }[];
  dailyStatistics: {
    time: Date;
    value: number;
  }[];
}