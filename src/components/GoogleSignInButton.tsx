import { GoogleLogin } from '@react-oauth/google';
import { loginWithGoogle } from '../services/backendApi';
import { saveSession } from '../services/session';

interface Props {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export default function GoogleSignInButton({ onSuccess, onError }: Props) {
  return (
    <div className="google-signin">
      <GoogleLogin
        theme="filled_black"
        shape="pill"
        text="continue_with"
        width="320"
        onSuccess={async (resp) => {
          try {
            if (!resp.credential) {
              throw new Error('Không nhận được credential từ Google');
            }
            const auth = await loginWithGoogle(resp.credential);
            saveSession({ token: auth.token, user: auth.user, balance: auth.balance });
            onSuccess?.();
          } catch (err) {
            onError?.(err instanceof Error ? err.message : String(err));
          }
        }}
        onError={() => onError?.('Đăng nhập Google thất bại')}
      />
    </div>
  );
}
