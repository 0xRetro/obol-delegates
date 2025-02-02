// Helper to format numbers with commas
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }).format(num);
}; 