import { FormEvent, useState } from 'react';
import { useLocale } from '../../i18n';
import { getDisplayUser, getUpstreamMe, loadAuth } from '../../services/authStore';
import { gommoChangePassword } from '../../services/gommoAuth';

export default function AccountSettingsPage() {
  const { t } = useLocale();
  const user = getDisplayUser();
  const me = getUpstreamMe();
  const [name, setName] = useState(user.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  function handleProfile(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setNotice(t('account.settings.profilePending'));
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    if (!currentPw) {
      setError(t('account.settings.passwordRequired'));
      return;
    }
    if (newPw !== confirmPw) {
      setError(t('account.settings.passwordMismatch'));
      return;
    }
    if (newPw.length < 6) {
      setError(t('account.settings.passwordMin'));
      return;
    }

    const auth = loadAuth();
    if (!auth?.access_token) {
      setError(t('account.settings.invalidSession'));
      return;
    }

    setIsChangingPassword(true);
    try {
      const message = await gommoChangePassword({
        accessToken: auth.access_token,
        domain: auth.domain,
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.settings.passwordFailed'));
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="account-settings">
      <h1 className="account-content-title">{t('account.settings.title')}</h1>

      <section className="panel account-card">
        <h2>{t('account.settings.profileTitle')}</h2>
        <form onSubmit={handleProfile} className="form account-form">
          <label className="field">
            <span className="label">{t('account.settings.displayName')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{t('account.settings.email')}</span>
            <input value={user.email || me?.userInfo?.email || ''} readOnly />
          </label>
        </form>
      </section>

      <section className="panel account-card">
        <h2>{t('account.settings.passwordTitle')}</h2>
        <form onSubmit={handlePassword} className="form account-form">
          <label className="field">
            <span className="label">{t('account.settings.currentPassword')}</span>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="field">
            <span className="label">{t('account.settings.newPassword')}</span>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <label className="field">
            <span className="label">{t('account.settings.confirmPassword')}</span>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <button type="submit" className="btn account-teal-btn" disabled={isChangingPassword}>
            {isChangingPassword ? t('account.settings.updating') : t('account.settings.updatePassword')}
          </button>
        </form>
      </section>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
