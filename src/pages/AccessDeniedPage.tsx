import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldX, LogOut, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const role = typeof user?.role === 'string' ? user.role : 'unknown';
  const name = user?.full_name ?? user?.name ?? 'there';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(135deg, hsl(330 80% 97%) 0%, hsl(270 60% 96%) 50%, hsl(187 70% 95%) 100%)',
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-edtech-lg p-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid hsl(270 20% 92%)',
        }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(0 84% 60% / 0.12), hsl(0 84% 60% / 0.06))',
            border: '2px solid hsl(0 84% 60% / 0.2)',
          }}
        >
          <ShieldX
            className="w-10 h-10"
            style={{ color: 'hsl(0 84% 55%)' }}
          />
        </div>

        {/* Heading */}
        <h1
          className="text-2xl font-bold mb-2"
          style={{
            fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
            color: 'hsl(240 10% 15%)',
          }}
        >
          Access Denied
        </h1>

        {/* Sub-message */}
        <p className="text-muted-foreground text-sm mb-1">
          Hi <strong>{name}</strong>, your account role is{' '}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
            style={{
              background: 'hsl(0 84% 60% / 0.1)',
              color: 'hsl(0 84% 45%)',
            }}
          >
            {role}
          </span>
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          This portal is only available to{' '}
          <strong className="text-foreground">teachers</strong> and{' '}
          <strong className="text-foreground">students</strong>.
          <br />
          Please contact your school administrator if you believe this is a mistake.
        </p>

        {/* Divider */}
        <div
          className="h-px mb-6"
          style={{ background: 'hsl(270 20% 92%)' }}
        />

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{
              background:
                'linear-gradient(90deg, hsl(187 96% 42%), hsl(262 83% 58%))',
            }}
          >
            <LogOut className="w-4 h-4" />
            Log out &amp; switch account
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-colors hover:bg-sidebar-accent text-muted-foreground hover:text-foreground border"
            style={{ borderColor: 'hsl(270 20% 92%)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
