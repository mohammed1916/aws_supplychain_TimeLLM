import { FormEvent, useState } from 'react';
import { Brain, Lock, Mail, AlertCircle, KeyRound } from 'lucide-react';
import { authService, AuthError, NewPasswordChallenge } from '../services/authService';

interface LoginPageProps {
  onSignedIn: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSignedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challenge, setChallenge] = useState<NewPasswordChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (challenge) {
        await authService.completeNewPassword(challenge, newPassword);
        onSignedIn();
        return;
      }
      const result = await authService.signIn(email.trim(), password);
      if ('challenge' in result) {
        setChallenge(result);
        return;
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">TimeWise Supply Chain</h1>
            <p className="text-sm text-slate-500">Sign in to your workspace</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 space-y-5"
        >
          {challenge ? (
            <>
              <div className="flex items-start space-x-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <KeyRound className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                <span>Your temporary password must be replaced before continuing.</span>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">New password</span>
                <input
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <span className="text-xs text-slate-500">
                  Minimum 12 characters with upper/lower case, numbers, and symbols.
                </span>
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </label>
            </>
          )}

          {error && (
            <div className="flex items-start space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 text-white font-medium hover:from-blue-700 hover:to-teal-600 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : challenge ? 'Set new password' : 'Sign in'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Accounts are provisioned by your administrator.
          </p>
        </form>
      </div>
    </div>
  );
};
