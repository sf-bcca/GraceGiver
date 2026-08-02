import { describe, it, expect, vi } from 'vitest';
import stream from 'stream';
import { generateBatchStatement, exportTransactions } from '../../reports';

describe('Reports & Export Unit Tests', () => {
  it('generateBatchStatement queries using LEFT JOIN for guest donations', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            member_id: 'guest',
            first_name: 'Guest',
            last_name: 'Non-Member',
            address: null,
            city: null,
            state: null,
            zip: null,
            donation_id: 1,
            amount: '100.00',
            fund: 'General',
            donation_date: '2026-05-01',
            notes: null
          }
        ]
      })
    };

    const mockRes = new stream.PassThrough();

    await generateBatchStatement(mockPool, '2026', mockRes);

    expect(mockPool.query).toHaveBeenCalled();
    const queryText = mockPool.query.mock.calls[0][0];
    expect(queryText).toContain('LEFT JOIN members m ON d.member_id = m.id');
    expect(queryText).toContain("COALESCE(m.first_name, 'Guest')");
  });

  it('exportTransactions queries using LEFT JOIN for guest donations', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            donation_date: '2026-05-01',
            amount: '100.00',
            fund: 'General',
            notes: null,
            entered_by: 'admin',
            first_name: 'Guest',
            last_name: 'Non-Member',
            member_id: null
          }
        ]
      })
    };

    const mockRes = new stream.PassThrough();

    await exportTransactions(mockPool, '2026', mockRes);

    expect(mockPool.query).toHaveBeenCalled();
    const queryText = mockPool.query.mock.calls[0][0];
    expect(queryText).toContain('LEFT JOIN members m ON d.member_id = m.id');
    expect(queryText).toContain("COALESCE(m.first_name, 'Guest')");
  });
});
