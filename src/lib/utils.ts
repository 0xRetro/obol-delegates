import crypto from 'crypto';

// Simple token generation for authentication
export const generateToken = (timestamp: number): string => {
  const data = `test-auth-${timestamp}-${process.env.TEST_PAGE_PASSWORD}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Token validation
export const validateToken = (token: string): boolean => {
  // Tokens are valid for 24 hours
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  // Check recent timestamps
  for (let timestamp = now; timestamp > oneDayAgo; timestamp -= 60000) { // Check every minute
    const validToken = generateToken(Math.floor(timestamp / 60000) * 60000);
    if (token === validToken) {
      return true;
    }
  }
  
  return false;
}; 

// Helper to format numbers with commas
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }).format(num);
}; 