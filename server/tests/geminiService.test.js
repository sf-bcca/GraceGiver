/**
 * Gemini Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMemberNarrative, setGenAIInstance } from '../geminiService';

describe('Gemini Service', () => {
  let mockGenerateContent;
  let mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    mockGenerateContent = vi.fn();
    const mockGenAI = {
      models: {
        generateContent: mockGenerateContent
      }
    };
    
    setGenAIInstance(mockGenAI);

    // Mock global fetch for Gemma calls
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });
  
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    // Reset instance
    setGenAIInstance(null);
    vi.unstubAllGlobals();
  });

  describe('generateMemberNarrative', () => {
    const member = {
      firstName: 'John',
      lastName: 'Doe'
    };

    const donations = [
      { date: '2025-01-15', amount: 100, fund: 'Tithes' },
      { date: '2025-06-20', amount: 50, fund: 'Missions' }
    ];

    it('should generate a narrative when Gemma is successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Gemma says John is great.' } }]
        })
      });
      
      const result = await generateMemberNarrative(member, donations, 2025);

      expect(result).toBe('Gemma says John is great.');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should fallback to Gemini when Gemma fails', async () => {
      mockFetch.mockRejectedValue(new Error('Gemma connection failed'));
      mockGenerateContent.mockResolvedValue({
        text: 'John has been a faithful giver this year.'
      });

      const result = await generateMemberNarrative(member, donations, 2025);

      expect(result).toBe('John has been a faithful giver this year.');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should return default message when both engines fail', async () => {
      mockFetch.mockRejectedValue(new Error('Gemma down'));
      setGenAIInstance(null);
      delete process.env.GEMINI_API_KEY;
      delete process.env.API_KEY;

      const result = await generateMemberNarrative(member, donations, 2025);
      
      expect(result).toContain('Error generating narrative');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Gemma down'));
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await generateMemberNarrative(member, donations, 2025);

      expect(result).toContain('Error generating narrative');
    });
  });
});
