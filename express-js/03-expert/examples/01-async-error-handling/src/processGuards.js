export function installProcessGuards() {
  process.on('unhandledRejection', (reason) => {
    console.error(
      JSON.stringify({
        level: 'fatal',
        type: 'unhandledRejection',
        reason: reason instanceof Error ? reason.message : String(reason),
      }),
    );
  });

  process.on('uncaughtException', (err) => {
    console.error(
      JSON.stringify({
        level: 'fatal',
        type: 'uncaughtException',
        message: err.message,
        stack: err.stack,
      }),
    );
    // In production, exit so the orchestrator restarts a clean process.
    if (process.env.EXIT_ON_UNCAUGHT === '1') {
      process.exit(1);
    }
  });
}
