const API_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function handleResponse(response: Response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    window.location.reload(); // Simple way to reset auth state
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API request failed');
  }
  return response.json();
}

export async function login(credentials: any) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    throw new Error('Invalid credentials');
  }
  return response.json();
}

export async function fetchMembers(page = 1, limit = 50, search = '') {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search });
  const response = await fetch(`${API_URL}/api/members?${params}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

export async function getMember(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

export async function createMember(member: any) {
  const response = await fetch(`${API_URL}/api/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(member),
  });
  return handleResponse(response);
}

export async function updateMember(id: string, member: any) {
  const response = await fetch(`${API_URL}/api/members/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(member),
  });
  return handleResponse(response);
}

export async function deleteMember(id: string) {
  const response = await fetch(`${API_URL}/api/members/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchDonations(page = 1, limit = 50) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetch(`${API_URL}/api/donations?${params}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

export async function createDonation(donation: any) {
  const response = await fetch(`${API_URL}/api/donations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(donation),
  });
  return handleResponse(response);
}

export async function updateDonation(id: string, donation: any) {
  const response = await fetch(`${API_URL}/api/donations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(donation),
  });
  return handleResponse(response);
}

export async function deleteDonation(id: string) {
  const response = await fetch(`${API_URL}/api/donations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
