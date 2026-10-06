import { spawn } from "node:child_process";
import { testEnvironment } from "./test-env";
const child = spawn(
  "bun",
  ["run", "start", "--hostname", "127.0.0.1", "--port", "3010"],
  { env: testEnvironment, stdio: "inherit" },
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    child.kill(signal);
  });
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
