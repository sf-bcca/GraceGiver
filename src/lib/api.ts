import { ChurchSettings, Member, Donation } from "../../types";

const API_URL = import.meta.env.VITE_API_URL || "";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response: Response) {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.reload(); // Simple way to reset auth state
    throw new Error("Unauthorized");
  }
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Access denied");
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "API request failed");
  }
  return response.json();
}

// Helpers to map API responses (snake_case) to Frontend types (camelCase)
function mapMember(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    telephone: row.telephone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    familyId: row.family_id,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
  };
}

function mapDonation(row: any) {
  if (!row) return null;
  return {
    id: row.id.toString(),
    memberId: row.member_id,
    amount: parseFloat(row.amount),
    fund: row.fund,
    notes: row.notes,
    enteredBy: row.entered_by,
    date: row.donation_date,
    timestamp: row.donation_date,
  };
}

export async function login(credentials: any) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Throw an error with the full response data for handling account lockout, etc.
    const error = new Error(data.error || "Invalid credentials") as any;
    error.response = data;
    error.status = response.status;
    throw error;
  }
  
  return data;
}

export async function fetchMembers(page = 1, limit = 50, search = "") {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
  });
  const response = await fetch(`${API_URL}/api/members?${params}`, {
    headers: getAuthHeaders(),
  });
  const result = await handleResponse(response);
  return {
    ...result,
    data: result.data.map((m: any) => ({
      // If the API returns mapped data usually, we might double map?
      // Checking server logic: GET /api/members ALREADY maps it.
      // Wait, server/index.js lines 64-65 show it maps manually.
      // So fetchMembers logic was fine, but let's reuse the type if we can,
      // OR mostly importantly fix create/update which returns raw rows.
      // Let's stick to the server's behavior:
      // GET list returns mapped. POST/PUT returns RAW.
      // So we only map for the ones returning RAW.
      ...m,
    })),
  };
}

// Override fetchMembers to be safe, but actually server already maps list.
// But Create/Update returns raw.
// Let's implement createMember properly.

export async function getMember(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(response);
  // Server GET /:id returns mapped data too?
  // Let's check server/index.js line 97. Yes, it returns mapped data.
  return data;
}

export async function createMember(member: any) {
  const response = await fetch(`${API_URL}/api/members`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(member),
  });
  const data = await handleResponse(response);
  return mapMember(data);
}

export async function updateMember(id: string, member: any) {
  const response = await fetch(`${API_URL}/api/members/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(member),
  });
  const data = await handleResponse(response);
  return mapMember(data);
}

export async function deleteMember(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function exportData(type: 'donations' | 'members', format: 'csv' | 'json', startDate?: string, endDate?: string, fund?: string) {
  let url = `${API_URL}/api/export/${type}?format=${format}`;
  if (type === 'donations' && startDate && endDate) {
    url += `&startDate=${startDate}&endDate=${endDate}`;
  }
  if (type === 'donations' && fund) {
    url += `&fund=${fund}`;
  }
  const response = await fetch(url, { headers: getAuthHeaders() });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to export ${type}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  a.remove();
}

export async function fetchMemberReport(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}/report`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(response);
  return data;
}

export async function downloadMemberReportPDF(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}/report/pdf`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to generate PDF");
  }

  return response.blob();
}

export async function fetchMemberStatement(id: string, year: string) {
  const response = await fetch(`${API_URL}/api/reports/member-statement/${id}?year=${year}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchMemberNarrative(id: string, year: string) {
  const response = await fetch(`${API_URL}/api/reports/member-narrative/${id}?year=${year}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function downloadMemberStatement(id: string, year: string) {
  const response = await fetch(`${API_URL}/api/reports/member-statement/${id}?year=${year}&format=pdf`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to generate PDF");
  }

  return response.blob();
}

export async function fetchDonations(page = 1, limit = 50) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(`${API_URL}/api/donations?${params}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createDonation(donation: any) {
  const response = await fetch(`${API_URL}/api/donations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(donation),
  });
  const data = await handleResponse(response);
  return mapDonation(data);
}

export async function updateDonation(id: string, donation: any) {
  const payload: { [key: string]: any } = { ...donation };
  // payload.donationDate is already in the correct format for the backend


  const response = await fetch(`${API_URL}/api/donations/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(response);
  return mapDonation(data);
}

export async function deleteDonation(id: string) {
  const response = await fetch(`${API_URL}/api/donations/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchDonationSummary() {
  const response = await fetch(`${API_URL}/api/donations/summary`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// ==========================================
// SELF-SERVICE API (Member Portal)
// ==========================================

export async function fetchSelfProfile() {
  const response = await fetch(`${API_URL}/api/self/profile`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchSelfDonations(page = 1, limit = 50) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(`${API_URL}/api/self/donations?${params}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchSelfStatements() {
  const response = await fetch(`${API_URL}/api/self/statements`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchSelfOpportunities() {
  const response = await fetch(`${API_URL}/api/self/opportunities`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function downloadBatchStatement(year: string) {
  const response = await fetch(
    `${API_URL}/api/reports/statements?year=${year}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to generate PDF");
  }

  return response.blob();
}

export async function exportTransactions(year: string) {
  const response = await fetch(`${API_URL}/api/reports/export?year=${year}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to export CSV");
  }

  return response.blob();
}

export async function getMissingEmailsReport() {
  const response = await fetch(`${API_URL}/api/reports/missing-emails`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch missing emails report");
  }

  return response.json();
}

export async function getNewDonorsReport() {
  const response = await fetch(`${API_URL}/api/reports/new-donors`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch new donors report");
  }

  return response.json();
}

// Phase 3: Chart APIs
export async function getFundDistribution(year: string) {
  const response = await fetch(
    `${API_URL}/api/reports/fund-distribution?year=${year}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch fund distribution");
  }

  return response.json();
}

export async function getQuarterlyProgress(year: string) {
  const response = await fetch(
    `${API_URL}/api/reports/quarterly-progress?year=${year}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch quarterly progress");
  }

  return response.json();
}

export async function getTrendAnalysis() {
  const response = await fetch(`${API_URL}/api/reports/trend-analysis`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch trend analysis");
  }

  return response.json();
}

export async function fetchOpportunities() {
  const response = await fetch(`${API_URL}/api/opportunities`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createOpportunity(opportunity: any) {
  const response = await fetch(`${API_URL}/api/opportunities`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(opportunity),
  });
  return handleResponse(response);
}

export async function fetchMemberSkills(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}/skills`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function updateMemberSkills(id: string, skills: string[], interests: string[]) {
  const response = await fetch(`${API_URL}/api/members/${id}/skills`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ skills, interests }),
  });
  return handleResponse(response);
}

export async function fetchOpportunityMatches(id: string) {
  const response = await fetch(`${API_URL}/api/opportunities/${id}/matches`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchCampaigns() {
  const response = await fetch(`${API_URL}/api/stewardship/campaigns`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createCampaign(campaign: any) {
  const response = await fetch(`${API_URL}/api/stewardship/campaigns`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(campaign),
  });
  return handleResponse(response);
}

export async function fetchSettings() {
  const response = await fetch(`${API_URL}/api/settings`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response);
}

export async function updateSettings(settings: ChurchSettings) {
  const response = await fetch(`${API_URL}/api/settings`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  return handleResponse(response);
}
