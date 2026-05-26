import { useEffect } from 'react';

/**
 * OAuth callback page — opened in a popup by LoginPage's Google button.
 * Reads the id_token from the URL hash fragment (implicit flow),
 * posts it to the opener window, then closes itself.
 */
export default function OAuthCallback() {
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove leading '#'
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'GOOGLE_OAUTH', idToken, error },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <p className="text-white text-sm font-medium animate-pulse">
        Đang xử lý đăng nhập Google…
      </p>
    </div>
  );
}
