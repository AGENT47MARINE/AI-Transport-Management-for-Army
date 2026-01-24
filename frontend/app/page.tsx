
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Key, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-redirect if already logged in?
    // Maybe yes, maybe no. User might want to login as diff user.
    // Let's NOT auto-redirect for better UX on "Logout".
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Success
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('username', data.username);

      // Redirect based on Role
      if (data.role === 'COMMANDER') {
        router.push('/dashboard');
      } else if (data.role === 'TCP_INCHARGE') {
        router.push('/tcp-dashboard');
      } else {
        router.push('/dashboard'); // Fallback
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundImage: "url('/military_camo_bg.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Courier New, monospace'
    }}>

      {/* Overlay to dim the background slightly for readability */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}></div>

      <div style={{
        position: 'relative',
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        background: 'rgba(63, 77, 56, 0.95)', // Camo Green
        borderRadius: '12px',
        border: '2px solid #5a6b48', // Lighter Olive
        zIndex: 1,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{
          margin: '0 auto 20px auto',
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/army_logo.png"
            alt="Army Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
            }}
          />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px', color: '#d4cbb8', textTransform: 'uppercase', letterSpacing: '2px' }}>Restricted Access</h1>
        <p style={{ color: '#a3a3a3', marginBottom: '30px', fontSize: '12px', textTransform: 'uppercase' }}>Military Transport Command</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

          {error && (
            <div style={{ background: 'rgba(127, 29, 29, 0.5)', color: '#fca5a5', padding: '10px', borderRadius: '4px', fontSize: '14px', border: '1px solid #ef4444' }}>
              {error}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8b7355', pointerEvents: 'none' }}>
              <UserCogIcon size={20} />
            </div>
            <input
              type="text"
              placeholder="OPERATIVE ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full box-border bg-[#2a3323] border border-[#5a6b48] text-[#d4cbb8] placeholder-[#6b7280] rounded focus:outline-none focus:border-[#8b7355] transition-all duration-200 pl-[50px] p-[14px] text-[15px] uppercase tracking-wider"
              style={{ fontFamily: 'Courier New, monospace' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8b7355', pointerEvents: 'none' }}>
              <Lock size={20} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="ACCESS CODE"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full box-border bg-[#2a3323] border border-[#5a6b48] text-[#d4cbb8] placeholder-[#6b7280] rounded focus:outline-none focus:border-[#8b7355] transition-all duration-200 pl-[50px] pr-[50px] p-[14px] text-[15px] tracking-wider"
              style={{ fontFamily: 'Courier New, monospace' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8b7355', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              className="hover:text-[#d4cbb8] transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '14px',
              background: loading ? '#2a3323' : '#4b5320', // Army Green
              color: loading ? '#6b7280' : '#d4cbb8',
              fontWeight: 'bold',
              border: '1px solid #3b4318',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            }}
          >
            {loading ? 'VERIFYING...' : 'INITIATE SESSION'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', borderTop: '1px solid #5a6b48', paddingTop: '10px' }}>
          UNAUTHORIZED ACCESS IS A CRIMINAL OFFENSE. IP LOGGED.
        </div>
      </div>
    </div>
  );
}

// Icon helper since lucide Key/User might vary slightly in exports or user pref
function UserCogIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
