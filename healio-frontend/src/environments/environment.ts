const isLocalEnvironment = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '4200'
);

export const environment = {
  production: false,
  apiBaseUrl: isLocalEnvironment
    ? 'http://localhost:8000'
    : 'https://healio-backend-ugg5.onrender.com',
  /**
   * Google OAuth 2.0 Web Client ID from Google Cloud Console.
   * If you have a Google Cloud Project, generate a Web Client ID,
   * add http://localhost:4200 to Authorized JavaScript Origins, and paste it here.
   * Leave blank or placeholder to use seamless local development Google sign-in.
   */
  googleClientId: ''
};
