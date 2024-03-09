export default function OAuthProvider({ children, }: Readonly<{
  children: React.ReactNode;
}>) {
    return (
        <div className="flex w-16 h-16 bg-secondary-foreground rounded-md justify-center items-center text-primary">
            {children}
        </div>
    );
}