export default function SectionTitle({ title }: { title: string }) {
    return (
        <h2 className="py-4 w-full text-primary-foreground text-left text-xl font-semibold uppercase tracking-[0.3rem]">
            {title}
        </h2>
    );
}