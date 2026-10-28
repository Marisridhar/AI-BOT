import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LogOut, User, Shield, GraduationCap } from 'lucide-react';

export const Header = ({ currentScreen, onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="app-header">
      <div className="header-title-area">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {isAdmin ? 'Admin Workspace' : 'Student Learning Hub'}
        </h2>
      </div>

      <div className="header-user">
        <div className="user-badge">
          {isAdmin ? <Shield size={14} /> : <GraduationCap size={14} />}
          <span>{user?.name} ({user?.role})</span>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign out"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

