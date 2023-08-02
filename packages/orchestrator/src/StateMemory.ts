/**
 * For each function remembers its latest state (upload timestamp)
 */
export default class StateMemory {

    private states: {
        [lambdaId: string]: {
            timestamp: number
        }
    } = {};

    public getOldestState(): {
        lambdaId: string,
        timestamp: number
        } {
        let oldestState: {
            lambdaId: string,
            timestamp: number
        } = {
            lambdaId: Object.keys(this.states)[0],
            timestamp: this.states[Object.keys(this.states)[0]].timestamp
        };

        for (const lambdaId in this.states) {
            if (!oldestState || this.states[lambdaId].timestamp < oldestState.timestamp) {
                oldestState = {
                    lambdaId,
                    timestamp: this.states[lambdaId].timestamp
                };
            }
        }

        return oldestState;
    }

    public updateState(lambdaId: string, timestamp: number): void {
        this.states[lambdaId] = { timestamp };
    }
}