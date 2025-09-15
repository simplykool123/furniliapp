// Utility to debug authentication token issues
export const debugToken = () => {
  const token = localStorage.getItem('authToken');
  // Token debug info (commented out for production)
  // console.group('🔍 Token Debug Info');
  // console.log('Token exists:', !!token);
  // console.log('Token length:', token?.length || 0);
  // console.log('Token starts with:', token?.substring(0, 10));
  // console.log('Token ends with:', token?.substring(token.length - 10));
  
  // Check for common issues
  // if (token) {
    // console.log('Has newlines:', token.includes('\n'));
    // console.log('Has carriage returns:', token.includes('\r'));
    // console.log('Has tabs:', token.includes('\t'));
    // console.log('Has extra spaces:', token !== token.trim());
    // console.log('Contains only valid chars:', /^[A-Za-z0-9\-_\.]+$/.test(token));
  // }
  
  // console.groupEnd();
  return token;
};

export const cleanToken = () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    const cleanedToken = token.trim().replace(/[\r\n\t]/g, '');
    if (token !== cleanedToken) {
      // console.warn('Token was corrupted, cleaning:', { original: token, cleaned: cleanedToken });
      localStorage.setItem('authToken', cleanedToken);
      return cleanedToken;
    }
  }
  return token;
};