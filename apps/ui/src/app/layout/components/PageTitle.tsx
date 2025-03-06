export default function PageTitle({
    title,
    uppercase = false,
}: {
  title: string;
  uppercase?: boolean;
}) {
    return (
        <h1
            className={`py-4 w-full text-contrast_primary text-left text-2xl font-bold ${
                uppercase ? "uppercase" : ""
            }`}
        >
            {title}
        </h1>
    );
}