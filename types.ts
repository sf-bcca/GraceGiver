export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  familyId?: string;
  createdAt: string;
}

export enum FundType {
  GENERAL = "General Fund",
  BUILDING = "Building Fund",
  MISSIONS = "Missions",
  YOUTH = "Youth Ministry",
  BENEVOLENCE = "Benevolence",
}

export interface Donation {
  id: string;
  memberId: string;
  amount: number;
  fund: FundType;
  date: string;
  notes?: string;
  enteredBy: string;
  timestamp: string;
}

export interface ChurchSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
}

// Added AuditLog interface to resolve import error in mockData.ts and support security tracking
export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  description: string;
  user: string;
  timestamp: string;
}

export type ViewState =
  | "DASHBOARD"
  | "MEMBERS"
  | "ENTRY"
  | "REPORTS"
  | "AUDIT"
  | "SETTINGS"
  | "USERS";
