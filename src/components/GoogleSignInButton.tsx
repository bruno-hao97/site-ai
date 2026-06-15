interface Props {
  onError?: (msg: string) => void;
}

/** Google login tắt — app dùng Access Token Gommo trực tiếp. */
export default function GoogleSignInButton({ onError }: Props) {
  void onError;
  return null;
}
