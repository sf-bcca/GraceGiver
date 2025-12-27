const API_URL = import.meta.env.VITE_API_URL || '';

export async function fetchMembers() {
  const response = await fetch(`${API_URL}/api/members`);
  if (!response.ok) {
    throw new Error('Failed to fetch members');
  }
  return response.json();
}

export async function createMember(member: any) {
  const response = await fetch(`${API_URL}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  if (!response.ok) {
    throw new Error('Failed to create member');
  }
  return response.json();
}

export async function fetchDonations() {
  const response = await fetch(`${API_URL}/api/donations`);
  if (!response.ok) {
    throw new Error('Failed to fetch donations');
  }
  return response.json();
}

export async function createDonation(donation: any) {
  const response = await fetch(`${API_URL}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(donation),
  });
  if (!response.ok) {
    throw new Error('Failed to create donation');
  }
  return response.json();
}
