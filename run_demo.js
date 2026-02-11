const { spawn } = require("child_process");

// Start the MedSupply app
const server = spawn("node", ["medsupply.js"], { stdio: "inherit" });
const mailer = spawn("node", ["mailer.js"], {stdio: "inherit"});

// Function to gracefully shutdown
function shutdown() {
  console.log("\nShutting down MedSupply server gracefully...");
  server.kill("SIGTERM");
  process.exit(0);
}

// Catch termination signals
process.on("SIGINT", shutdown);   // Ctrl+C
process.on("SIGTERM", shutdown);  // kill command

// Optional: Detect if child process exits unexpectedly
server.on("exit", (code, signal) => {
  if (signal) {
    console.log(`Server terminated with signal: ${signal}`);
  } else {
    console.log(`Server exited with code: ${code}`);
  }
  process.exit(code);
});
