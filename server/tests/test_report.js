
const assert = require('assert');
const { generateMemberReportPDF } = require('../reports/memberReport');
// Mock PDFDocument to avoid actual file generation or dependency issues in unit test
const PDFDocument = require('pdfkit');

// Mock pool
const mockPool = {
  query: async (text, params) => {
    if (text.includes('SELECT * FROM members')) {
      if (params[0] === 'valid-id') {
        return {
          rows: [{
            id: 'valid-id',
            first_name: 'Test',
            last_name: 'Member',
            email: 'test@example.com',
            joined_at: '2020-01-01'
          }]
        };
      }
      return { rows: [] };
    }
    if (text.includes('SELECT \n        COALESCE(SUM(amount)')) {
      return {
        rows: [{
          lifetime_total: 1000,
          last_donation_date: '2024-01-01',
          last_donation_amount: 100
        }]
      };
    }
    if (text.includes('SELECT * FROM donations')) {
        return {
            rows: [
                { donation_date: '2024-01-01', amount: 100, fund: 'Tithes' }
            ]
        }
    }
    return { rows: [] };
  }
};

// Mock Response
const mockRes = {
    headers: {},
    setHeader: (k, v) => { mockRes.headers[k] = v; },
    on: () => {},
    once: () => {},
    emit: () => {},
    write: () => {},
    end: () => {}
};

async function testGenerateMemberReport() {
  console.log('Testing generateMemberReportPDF...');
  try {
    await generateMemberReportPDF(mockPool, 'valid-id', mockRes);
    console.log('✅ PDF Generation called successfully');
  } catch (err) {
    console.error('❌ PDF Generation failed', err);
    process.exit(1);
  }
}

testGenerateMemberReport();
