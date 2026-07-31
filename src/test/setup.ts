process.env.NODE_ENV = 'development';

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React, { act } from 'react';

// React test environment setup
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).React = React;

if (!(React as any).act) {
  (React as any).act = act;
}

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});