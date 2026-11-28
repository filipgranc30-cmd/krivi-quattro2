export type InstallDevice = "ios" | "android" | "desktop";

export function detectInstallDevice(userAgent: string, touchPoints = 0): InstallDevice {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  // iPadOS reports a desktop Mac UA and still has a touch screen.
  if (/Macintosh/i.test(userAgent) && touchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function isInAppBrowser(userAgent: string): boolean {
  return /Instagram|WhatsApp|Viber|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|Telegram/i.test(userAgent);
}

export const IOS_INSTALL_URL = "https://krivi-quattro2.vercel.app/";
export const IOS_BANNER_KEY = "kq.ios-install-dismissed";
