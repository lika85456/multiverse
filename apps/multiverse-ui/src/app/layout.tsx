import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainNav from "@/app/layout/MainNav";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Multiverse UI",
    description: "Serverless vector database.",
};

export default function RootLayout({ children, }: Readonly<{
  children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <div className="flex flex-col min-h-screen w-screeen justify-start">
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <MainNav />
                        <div
                            className={
                                "flex flex-1 flex-col w-full h-full px-4 lg:px-72 md:px-32 sm:px-4 justify-start items-center"
                            }
                        >
                            {children}
                        </div>
                    </ThemeProvider>
                </div>
                <Toaster />
            </body>
        </html>
    );
}