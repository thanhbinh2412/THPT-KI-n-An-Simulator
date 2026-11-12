import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Back to School",
  description: "A nostalgic 3D school exploration game",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
