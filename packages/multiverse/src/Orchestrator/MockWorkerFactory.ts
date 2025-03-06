import type { Worker } from "../Compute/Worker";
import type { Region } from "../core/DatabaseConfiguration";

// type ScalingTargetConfiguration = {
//     warmPrimaryInstances: number;
//     warmSecondaryInstances: number;
//     warmRegionalInstances: number;
//     secondaryFallbacks: number;
//     outOfRegionFallbacks: number;
// }

export type WorkerFactory = (name: string, region: Region, waitTime?: number) => Worker;

/**
 * This function creates a lambda factory. It should act as a "aws lambda" - it should keep warm instances and for computations
 * only use the instances that are NOT BEING USED. Every instance is reusable, but it can be called only if it's not being called from another request.
 * So for each instance keep track if it's being used or not (use a lock mechanism).
 * @param scalingTargetConfiguration
 */
export default function mockWorkerFactory(lambdaFactory: WorkerFactory): WorkerFactory {
    const workers: Map<{name: string, region: Region}, { worker: Worker, busy: boolean }[]> = new Map();

    // todo: vrácená instance workeru musí používat již existující instance, které nejsou zrovna použity
    // protože jinak samotná vrácená instance je znovupoužívaná a znovavolaná

    return (name: string, region: Region, waitTime = 0) => {

        function getFreeInstance() {
            const worker = workers.get({
                name,
                region
            });

            const freeInstance = worker?.find(w => !w.busy);

            if (!freeInstance) {
                // if there are no free instances, create a new one
                const newInstance = {
                    worker: lambdaFactory(name, region),
                    busy: false
                };

                worker?.push(newInstance);

                return newInstance;
            }

            return freeInstance;
        }

        const mockifiedWorker: Worker = {
            state: async() => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.state();
                instance.busy = false;

                return result;
            },
            query: async(query) => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.query(query);
                instance.busy = false;

                return result;
            },
            update: async(updates) => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.update(updates);
                instance.busy = false;

                return result;
            },
            saveSnapshot: async() => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.saveSnapshot();
                instance.busy = false;

                return result;
            },
            saveSnapshotWithUpdates: async() => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.saveSnapshotWithUpdates();
                instance.busy = false;

                return result;
            },
            loadLatestSnapshot: async() => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.loadLatestSnapshot();
                instance.busy = false;

                return result;
            },
            count: async() => {
                const instance = getFreeInstance();

                instance.busy = true;

                if (waitTime) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await instance.worker.count();
                instance.busy = false;

                return result;
            },
        };

        return mockifiedWorker;
    };
}