import { spawn } from "node:child_process";
import { testEnvironment } from "./test-env";
const child = spawn("bun", ["run", "build"], {
  env: testEnvironment,
  stdio: "inherit",
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
