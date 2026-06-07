import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-unmount React trees after each test to prevent state bleed.
afterEach(() => {
  cleanup();
});
