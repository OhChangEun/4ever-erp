let started = false;

export async function setupMocks() {
  if (started) return;
  if (typeof window === 'undefined') return;

  const shouldMock = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';
  console.log('[MSW] Environment check:', {
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
    shouldMock,
  });

  if (!shouldMock) return;

  try {
    const { worker } = await import('./browser');
    await worker.start({
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      onUnhandledRequest: 'warn',
      quiet: false,
    });
    console.log('[MSW] ✅ Mocking enabled');
    started = true;
  } catch (error) {
    console.error('[MSW] ❌ Failed to start:', error);
  }
}
