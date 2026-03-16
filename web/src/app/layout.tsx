import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptLoop",
  description: "Autonomous prompt optimizer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
