export interface DatabaseStatistics {
  dailyStatistics: {
    time: Date;
    value: number;
  }[];
}