
import { Member, Donation, FundType, AuditLog } from './types';

export const INITIAL_MEMBERS: Member[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', address: '123 Grace Ln', city: 'Faithville', state: 'TX', zip: '75001', createdAt: '2023-01-15' },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', address: '456 Hope Blvd', city: 'Faithville', state: 'TX', zip: '75001', createdAt: '2023-02-10' },
  { id: '3', firstName: 'Robert', lastName: 'Johnson', email: 'bob@example.com', address: '789 Mercy Ct', city: 'Faithville', state: 'TX', zip: '75001', createdAt: '2023-03-05' },
  { id: '4', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@example.com', address: '101 Peace Way', city: 'Faithville', state: 'TX', zip: '75001', createdAt: '2023-04-20' },
];

export const INITIAL_DONATIONS: Donation[] = [
  { id: 'd1', memberId: '1', amount: 500, fund: FundType.TITHES, date: '2024-05-01', timestamp: '2024-05-01T10:00:00Z', enteredBy: 'Admin' },
  { id: 'd2', memberId: '2', amount: 250, fund: FundType.UPKEEP, date: '2024-05-02', timestamp: '2024-05-02T11:30:00Z', enteredBy: 'Admin' },
  { id: 'd3', memberId: '1', amount: 100, fund: FundType.BENEVOLENCE, date: '2024-05-15', timestamp: '2024-05-15T09:15:00Z', enteredBy: 'Admin' },
  { id: 'd4', memberId: '3', amount: 1000, fund: FundType.TITHES, date: '2024-05-20', timestamp: '2024-05-20T14:45:00Z', enteredBy: 'Admin' },
  { id: 'd5', memberId: '4', amount: 50, fund: FundType.CHURCH_SCHOOL, date: '2024-05-25', timestamp: '2024-05-25T16:20:00Z', enteredBy: 'Admin' },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'a1', action: 'CREATE', entity: 'MEMBER', description: 'Added John Doe', user: 'Admin', timestamp: '2023-01-15T08:00:00Z' },
  { id: 'a2', action: 'CREATE', entity: 'DONATION', description: 'Added $500 donation for John Doe', user: 'Admin', timestamp: '2024-05-01T10:00:00Z' },
];
