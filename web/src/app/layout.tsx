import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

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
    <html lang="en" className={lora.variable}>
      <body className="bg-bg text-text antialiased">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
          {children}
        </div>
      </body>
    </html>
  );
}
