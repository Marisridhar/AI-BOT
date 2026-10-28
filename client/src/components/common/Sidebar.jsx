import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  BookOpen,
  FileEdit,
  CheckSquare,
  Users,
  Compass,
  BotMessageSquare,
  Code2,
  Award,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ currentScreen, onNavigate }) => {
  const { isAdmin } = useAuth();

  const adminNav = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'course-builder', label: 'Course Builder', icon: BookOpen },
    { id: 'lesson-editor', label: 'Lesson Editor', icon: FileEdit },
    { id: 'assignment-builder', label: 'Assignment Builder', icon: CheckSquare },
    { id: 'student-progress', label: 'Student Progress', icon: Users }
  ];

  const studentNav = [
    { id: 'student-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'learning-path', label: 'Learning Path', icon: Compass },
    { id: 'mentor', label: 'AI Mentor', icon: BotMessageSquare },
    { id: 'assignment-workspace', label: 'Assignment Workspace', icon: Code2 },
    { id: 'review-feedback', label: 'Review & Feedback', icon: Award }
  ];

  const navItems = isAdmin ? adminNav : studentNav;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <Sparkles size={22} color="var(--primary)" />
        <span>AI Bot</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          AI Bot v2.0 Platform
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

