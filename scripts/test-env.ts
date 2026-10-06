export const testEnvironment = {
  ...process.env,
  HERCULES_TEST_BUILD: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_local_tests_only_not_real",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3010",
};
