import prettyBytes from "pretty-bytes";

export default function format(
    value: number,
    options: "delim" | "compact" | "bytes" = "delim",
    style = "en-US",
): string {
    switch (options) {
    case "delim":
        return value.toLocaleString(style, {});
    case "compact":
        return value.toLocaleString(style, { notation: "compact" });
    case "bytes":
        return prettyBytes(value, { locale: style });
    default:
        return value.toString();
    }
}