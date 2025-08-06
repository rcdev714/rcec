// In-memory progress storage (in production, you might want to use Redis or a database)
const progressStorage = new Map<string, { fetched: number; total: number; lastUpdate: number }>();

// Clean up old progress entries (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, value] of progressStorage.entries()) {
    if (value.lastUpdate < oneHourAgo) {
      progressStorage.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Helper function to update progress (used by the export function)
export function updateProgress(sessionId: string, fetched: number, total: number) {
  progressStorage.set(sessionId, {
    fetched,
    total,
    lastUpdate: Date.now()
  });
}

// Helper function to clear progress
export function clearProgress(sessionId: string) {
  progressStorage.delete(sessionId);
}

// Helper function to get progress
export function getProgress(sessionId: string) {
  return progressStorage.get(sessionId);
}