
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe.skip('Member Report PDF Generation', () => {
  let generateAnnualStatementPDF;
  let MockPDFDocument;
  let mockDoc;
  let mockStream;
  
  const mockMember = { id: 1, firstName: 'John', lastName: 'Doe', address: '123 Main St', city: 'Test', state: 'TX', zip: '75001' };
  const mockDonations = [
    { date: '2025-01-01', fund: 'Tithes', amount: 100.00 },
    { date: '2025-02-01', fund: 'Missions', amount: 50.00 }
  ];
  const mockSummary = { totalAmount: 150.00, year: 2025 };
  const mockNarrative = 'Thank you John for your generosity!';

  beforeEach(async () => {
    vi.resetModules();
    
    MockPDFDocument = vi.fn();
    mockDoc = {
      pipe: vi.fn(),
      text: vi.fn().mockReturnThis(),
      fontSize: vi.fn().mockReturnThis(),
      font: vi.fn().mockReturnThis(),
      moveDown: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
      addPage: vi.fn().mockReturnThis(),
      image: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      y: 100
    };
    
    MockPDFDocument.mockImplementation(() => mockDoc);

    // Mock pdfkit before importing the module that uses it
    vi.doMock('pdfkit', () => MockPDFDocument);

    mockStream = {
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      write: vi.fn(),
      end: vi.fn()
    };

    // Dynamic import
    const module = await import('../../reports/memberReport');
    generateAnnualStatementPDF = module.generateAnnualStatementPDF;
  });

  it('should generate a PDF with required sections', () => {
    generateAnnualStatementPDF(mockMember, mockDonations, mockSummary, mockNarrative, mockStream);

    expect(MockPDFDocument).toHaveBeenCalled();
    expect(mockDoc.pipe).toHaveBeenCalledWith(mockStream);
    
    // Check Header
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Annual Contribution Statement'), expect.any(Object));
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Tax Year: 2025'), expect.any(Object));
    
    // Check Member Info
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('John Doe'));
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('123 Main St'));
    
    // Check Narrative
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Thank you John for your generosity!'));
    
    // Check Totals
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('$150.00'), expect.any(Number), expect.any(Number), expect.any(Object));
    
    // Check IRS Compliance
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('No goods or services were provided'), expect.any(Number), expect.any(Number), expect.any(Object));
  });
});
