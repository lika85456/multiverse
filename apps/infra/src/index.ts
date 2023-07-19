import { cli as cliGenerator } from "@multiverse/multiverse/src/StackCli";

(async() => {
    const cli = await cliGenerator();
    const result = await cli.deploy({ requireApproval: "never" as any });
    console.log(result);
})();