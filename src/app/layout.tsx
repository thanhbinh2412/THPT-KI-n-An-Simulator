import "./globals.css";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const previewImage = "/images/kien-an-high-school-entrance.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Trở Về Trường Xưa | THPT Kiến An",
    template: "%s | THPT Kiến An",
  },
  description: "Trải nghiệm trường THPT Kiến An trong không gian 3D: gặp gỡ bạn bè, khám phá sân trường, lớp học và những kỷ niệm thân quen.",
  applicationName: "Trở Về Trường Xưa – THPT Kiến An Simulator",
  keywords: ["THPT Kiến An", "Kiến An", "Hải Phòng", "trường xưa", "game 3D", "họp lớp", "school simulator"],
  authors: [{ name: "THPT Kiến An" }],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "Trở Về Trường Xưa – THPT Kiến An Simulator",
    title: "Trở Về Trường Xưa | THPT Kiến An",
    description: "Cùng trở về THPT Kiến An trong không gian 3D – sân trường, hành lang, lớp học và những người bạn thân quen.",
    images: [{ url: previewImage, width: 1672, height: 941, alt: "Cổng trường THPT Kiến An" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trở Về Trường Xưa | THPT Kiến An",
    description: "Khám phá THPT Kiến An trong không gian 3D.",
    images: [previewImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Trở Về Trường Xưa – THPT Kiến An Simulator",
    description: "Trải nghiệm và khám phá trường THPT Kiến An trong không gian 3D.",
    inLanguage: "vi-VN",
    image: new URL(previewImage, siteUrl).toString(),
    url: siteUrl,
    applicationCategory: "Game",
    operatingSystem: "Web",
  };
  return <html lang="vi"><head><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></head><body>{children}</body></html>;
}
