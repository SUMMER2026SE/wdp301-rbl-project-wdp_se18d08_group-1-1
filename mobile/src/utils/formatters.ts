export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);

export const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
};
