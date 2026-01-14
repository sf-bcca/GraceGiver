/**
 * Gemini Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMemberNarrative, setGenAIInstance } from '../geminiService';

describe('Gemini Service', () => {
  let mockGenerateContent;

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
  });
  
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    // Reset instance
    setGenAIInstance(null);
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

    it('should generate a narrative when API key is present', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'John has been a faithful giver this year.'
      });

      const result = await generateMemberNarrative(member, donations, 2025);

      expect(result).toBe('John has been a faithful giver this year.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents).toContain('John Doe');
      expect(callArgs.contents).toContain('$150'); // Total
      expect(callArgs.contents).toContain('Tithes');
    });

    it('should return default message when instance is null (simulating missing key behavior if checked)', async () => {
      // For this test, we want to simulate the case where getAIClient returns null
      // In our code: 
      // const ai = getAIClient();
      // if (!ai) return ...
      
      // If we set instance to null, getAIClient will try to create new one.
      // If we want to force null, we should ensure getAIClient returns null.
      // But getAIClient uses `genAI` variable.
      
      // If we setGenAIInstance(null), getAIClient will try to create new GoogleGenAI().
      // If API key is missing, it logs warning and returns null.
      
      setGenAIInstance(null);
      delete process.env.GEMINI_API_KEY;
      delete process.env.API_KEY;

      const result = await generateMemberNarrative(member, donations, 2025);
      
      expect(result).toContain('unavailable');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await generateMemberNarrative(member, donations, 2025);

      expect(result).toContain('Error generating narrative');
    });
  });
});
