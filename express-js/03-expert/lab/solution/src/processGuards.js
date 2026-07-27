export function installProcessGuards() {
  process.on('unhandledRejection', (reason) => {
    console.error(
      JSON.stringify({
        level: 'fatal',
        type: 'unhandledRejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        pid: process.pid,
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
        pid: process.pid,
      }),
    );
  });
}
