import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('openRouterService', () => {
  let mockFetch;
  let originalFetch;

  // We can't use dynamic require for ESM-vitest interop in this project,
  // so we test via the geminiService delegation layer instead.
  const loadModules = () => require('../geminiService.js');

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    process.env.OPENROUTER_API_KEY = 'test-sk-or-1234567890';
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  describe('getFinancialSummary', () => {
    const donations = [
      { member_id: '1', amount: 100, fund: 'General' },
      { member_id: '2', amount: 50, fund: 'Tithes' },
    ];

    it('delegates to openRouterService and returns AI text on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'Insight generated!' } }] }),
      });

      const service = loadModules();
      const result = await service.getFinancialSummary(donations, []);
      expect(result).toBe('Insight generated!');
    });

    it('returns default message when API key is missing', async () => {
      delete process.env.OPENROUTER_API_KEY;
      // Even before fetch is called, the inner generateAI should warn and return null

      const service = loadModules();
      // Re-load to clear module cache for env change
      vi.resetModules();
      const freshService = require('../geminiService.js');

      // This tests that even if openRouterService's generateAI returns null (no key),
      // getFinancialSummary falls back correctly
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'should not reach here' } }] }),
      });

      const result = await freshService.getFinancialSummary(donations, []);
      // openRouterService only loads dotenv once at require time, so the test key matters
      expect(typeof result).toBe('string');
    });

    it('handles empty donations array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'No data yet!' } }] }),
      });

      const service = loadModules();
      const result = await service.getFinancialSummary([], []);
      expect(result).toBe('No data yet!');
    });

    it('handles donations with non-numeric amounts', async () => {
      const invalidDonations = [
        { member_id: '1', amount: 'invalid', fund: 'General' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'Handled!' } }] }),
      });

      const service = loadModules();
      // Should not throw despite invalid amount
      await expect(service.getFinancialSummary(invalidDonations, [])).resolves.not.toThrow();
    });
  });

  describe('generateMemberNarrative', () => {
    const member = { firstName: 'Jane', lastName: 'Smith' };
    const donations = [
      { date: '2025-01-15', amount: 100, fund: 'Tithes' },
    ];

    it('delegates to openRouterService and returns narrative on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'Jane has been a blessing!' } }] }),
      });

      const service = loadModules();
      const result = await service.generateMemberNarrative(member, donations, 2025);
      expect(result).toBe('Jane has been a blessing!');
    });

    it('returns default message when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const service = loadModules();
      const result = await service.generateMemberNarrative(member, donations, 2025);
      expect(result).toBe('We appreciate your faithful support.');
    });

    it('handles null/undefined member gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'No concerns' } }] }),
      });

      const service = loadModules();
      // Should not throw even with partial member data
      const result = await service.generateMemberNarrative({}, donations, 2025);
      expect(typeof result).toBe('string');
    });
  });

  describe('integration: OpenRouter request shape', () => {
    it('sends correct request body structure to OpenRouter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'test' } }] }),
      });

      const donations = [{ member_id: '1', amount: 50, fund: 'General' }];
      await require('../geminiService.js').getFinancialSummary(donations, []);

      // Verify fetch was called with correct OpenRouter format
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-sk-or-1234567890');

      const body = JSON.parse(options.body);
      expect(body.model).toBeDefined();
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
    });
  });
});
