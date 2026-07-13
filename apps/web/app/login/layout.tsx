import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login – VibeGPT",
  description: "Sign in to VibeGPT Campus Study Agent",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
