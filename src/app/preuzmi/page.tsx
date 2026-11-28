import type { Metadata } from "next";
import { InstallGuide } from "@/components/install-guide";

export const metadata: Metadata = {
  title: "Preuzmi aplikaciju · Krivi Quattro",
  description: "Dodaj Krivi Quattro na početni zaslon iPhonea ili preuzmi Android APK.",
};

export default function PreuzmiPage() {
  return <InstallGuide />;
}
