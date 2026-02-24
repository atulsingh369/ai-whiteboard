import type { Metadata } from "next";
import { getCurrentAdminUser } from "@/lib/auth";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Whiteboard – Architect the Future",
  description: "AI-powered technical whiteboarding for engineering teams",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAdminUser();

  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface-app text-txt-primary antialiased min-h-screen">
        <Header user={user} />
        {children}
      </body>
    </html>
  );
}
