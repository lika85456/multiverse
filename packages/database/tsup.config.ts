import type { Options } from "tsup";

export const tsup: Options = {
    bundle: true,
    skipNodeModulesBundle: false,
    noExternal: [/./],
    minify: true
};