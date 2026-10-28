import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Sparkles, LogIn, UserPlus, Shield, GraduationCap, AlertCircle } from 'lucide-react';

export const AuthPage = () => {
  const { login, register, acceptInvitation, error } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isInvite, setIsInvite] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [inviteToken, setInviteToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      if (isInvite) {
        await acceptInvitation(inviteToken, password, name);
      } else if (isRegister) {
        await register(name, email, password, role);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            marginBottom: '12px'
          }}>
            <Sparkles size={26} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            AI Bot Learning Platform
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isInvite
              ? 'Accept your course invitation'
              : isRegister
              ? 'Create a new account'
              : 'Sign in to your learning workspace'}
          </p>
        </div>

        {(localError || error) && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isInvite && (
            <div className="form-group">
              <label className="form-label">Invitation Token</label>
              <input
                type="text"
                className="form-control"
                placeholder="Paste your invitation token from email"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                required
              />
            </div>
          )}

          {(isRegister || isInvite) && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          {!isInvite && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && !isInvite && (
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRole('student')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <GraduationCap size={16} />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRole('admin')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Shield size={16} />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : isInvite ? (
              'Accept & Get Started'
            ) : isRegister ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserPlus size={18} /> Register</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><LogIn size={18} /> Sign In</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
          {!isInvite ? (
            <div>
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setLocalError(''); }}
                style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                {isRegister ? 'Sign In' : 'Register'}
              </button>
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setIsInvite(true); setLocalError(''); }}
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Have an invitation token?
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setIsInvite(false); setLocalError(''); }}
              style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

