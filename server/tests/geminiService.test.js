import { describe, it, expect, vi } from 'vitest';

describe('geminiService (OpenRouter delegation)', () => {
  let geminiService;

  beforeEach(async () => {
    process.env.OPENROUTER_API_KEY = 'test-key-for-vitest';
    // Force fresh import each time via Node's module cache busting
    const path = await import('path');
    delete require.cache[require.resolve('../geminiService.js')];
    geminiService = require('../geminiService.js');
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    vi.restoreAllMocks();
  });

  it('deprecated callGemma should throw', async () => {
    await expect(geminiService.callGemma('test')).rejects.toThrow('no longer used');
  });

  it('deprecated callGemini should throw', async () => {
    await expect(geminiService.callGemini('test')).rejects.toThrow('no longer used');
  });

  it('deprecated getAIClient should throw', () => {
    expect(() => geminiService.getAIClient()).toThrow();
  });

  it('generateMemberNarrative delegates to openRouterService with default fallback', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    global.fetch = mockFetch;

    const result = await geminiService.generateMemberNarrative(
      { firstName: 'John', lastName: 'Doe' },
      [{ date: '2025-01-15', amount: 100, fund: 'General' }],
      2025
    );

    expect(result).toBe('We appreciate your faithful support.');
  });

  it('getFinancialSummary delegates to openRouterService with default fallback', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    global.fetch = mockFetch;

    const result = await geminiService.getFinancialSummary(
      [{ member_id: '1', amount: 100, fund: 'General' }],
      []
    );

    expect(result).toBe('Financial analysis is currently unavailable.');
  });
});
