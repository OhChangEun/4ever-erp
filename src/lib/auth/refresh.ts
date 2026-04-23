import axios from 'axios';
import { startAuthorization } from './startAuthorization';
import { persistAccessToken, readStoredToken } from './tokenStorage';

function makeBasicAuthHeader(clientId: string, clientSecret: string): string {
  const plain = `${clientId}:${clientSecret}`;
  const utf8 = new TextEncoder().encode(plain);
  let binary = '';
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
  const encoded = btoa(binary);
  return `Basic ${encoded}`;
}

export async function trySilentRefresh() {
  const { token } = readStoredToken();
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: 'everp', // Vercel
      // client_id: 'everp-spa', // local
    });

    const res = await axios.post('https://auth.everp.co.kr/oauth2/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: makeBasicAuthHeader('everp', 'super-secret'),
        access_token: token,
      },
      withCredentials: true,
    });

    const { access_token, expires_in } = res.data;

    persistAccessToken(access_token, expires_in);
  } catch (error) {
    startAuthorization('/');
    if (axios.isAxiosError(error)) {
      console.error('Silent refresh failed:', error.response?.data || error.message);
    } else {
      console.error('Silent refresh failed:', error);
    }
    throw new Error('refresh_failed');
  }
}
