
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) {
    return '';
  }

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
};

export const cleanInput = (field: string, value: string) => {
  switch (field) {
    case 'state':
      return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    case 'zip':
      return value.replace(/[^\d-]/g, '').slice(0, 10);
    case 'telephone':
    case 'phone':
      return value.replace(/\D/g, '').slice(0, 15);
    default:
      return value;
  }
};
