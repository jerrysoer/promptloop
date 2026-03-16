import type { Metadata } from "next";
import Link from "next/link";
import { Lora } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromptLoop — Autonomous Prompt Optimizer",
  description:
    "Iteratively mutate, score, and improve your LLM prompts. Paste a prompt, add test cases, and let the optimizer find the best version.",
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  openGraph: {
    title: "PromptLoop — Autonomous Prompt Optimizer",
    description:
      "Iteratively mutate, score, and improve your LLM prompts.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lora.variable} style={{ scrollBehavior: "smooth" }}>
      <body className="bg-bg text-text antialiased">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
          <nav className="mb-8 flex items-center gap-6 text-sm">
            <Link href="/" className="font-heading text-lg font-semibold hover:text-accent transition-colors">
              PromptLoop
            </Link>
            <Link href="/runs" className="text-text-muted hover:text-text transition-colors">
              Runs
            </Link>
            <a
              href="https://github.com/jerrysoer/promptloop"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-text-muted hover:text-text transition-colors"
            >
              GitHub
            </a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
