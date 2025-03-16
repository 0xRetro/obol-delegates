import { generateToken } from './utils';

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