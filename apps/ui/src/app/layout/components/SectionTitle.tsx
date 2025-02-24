import { cn } from "@/lib/utils";

export default function SectionTitle({
    title,
    className,
}: {
  title: string;
  className?: string;
}) {
    return (
        <h2
            className={cn(
                "py-4 w-full text-primary-foreground text-left text-xl font-semibold uppercase tracking-[0.3rem]",
                className,
            )}
        >
            {title}
        </h2>
    );
}