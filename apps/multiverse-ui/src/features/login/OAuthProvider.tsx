export default function OAuthProvider({ children, }: Readonly<{
  children: React.ReactNode;
}>) {
    return (
        <div className="flex w-16 h-16 bg-[#e6e6e6] hover:bg-[#b3b3b3] text-[#1a1a1a] rounded-md justify-center items-center transition-all">
            {children}
        </div>
    );
}