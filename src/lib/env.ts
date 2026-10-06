import { z } from "zod";
export const publicEnvSchema = z.object({
  url: z
    .url()
    .refine(
      (url) =>
        new URL(url).protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(new URL(url).hostname),
      "HTTPS required outside localhost",
    ),
  key: z
    .string()
    .min(20)
    .refine(
      (key) => !key.startsWith("sb_secret_"),
      "Never expose a secret key",
    ),
  site: z.url().refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  }, "Use the HTTPS app origin (localhost is allowed for local development)"),
});
export function publicEnv() {
  return publicEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    site: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
export function configured(): boolean {
  return publicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    site: process.env.NEXT_PUBLIC_SITE_URL,
  }).success;
}
export function safeNext(value: string | null): string {
  return value &&
    [
      "/home",
      "/library",
      "/tools",
      "/progress",
      "/profile",
      "/workout",
      "/onboarding",
    ].includes(value)
    ? value
    : "/home";
}
export function trustedOrigin(origin: string | null, site: string): boolean {
  return origin !== null && origin === new URL(site).origin;
}
