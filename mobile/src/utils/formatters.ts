export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);

export const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
};
