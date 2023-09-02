type FunctionArguments<Fn> = Fn extends (...args: infer A) => any ? A : never;
type ReturnType<Fn> = Fn extends (...args: any[]) => infer R ? R : never;

/**
 * Database lambda should:
 * 1. wake up all the necessary instances
 * 2. invoke the action on an instance that is ready
 * 3. scale up instances or their resources if necessary
 */
export default interface DatabaseLambda{
    wake(): Promise<void>;
    invoke<Client>(
        action: keyof Client,
        payload: FunctionArguments<Client[typeof action]>[0]
    ): Promise<ReturnType<Client[typeof action]>>;
    createPartition(): Promise<void>;
    deleteResources(): Promise<void>;
}