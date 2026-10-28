import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Compass,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle
} from 'lucide-react';

export const StudentDashboard = ({ onNavigate, onSelectCourse, onSelectLesson, onSelectTask }) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message || 'Failed to load your learning dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = async (courseSummary) => {
    if (onSelectCourse) {
      onSelectCourse(courseSummary.course, courseSummary.enrollmentId);
    }

    const action = courseSummary.recommendedAction;
    if (action === 'open_assignment' || action === 'revise_submission') {
      onNavigate('assignment-workspace');
    } else if (action === 'take_understanding_check' || action === 'continue_lesson') {
      if (courseSummary.currentLesson && onSelectLesson) {
        onSelectLesson(courseSummary.currentLesson, courseSummary.enrollmentId);
      }
      onNavigate('learning-path');
    } else {
      onNavigate('learning-path');
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading your courses and progress...</p>;
  }

  return (
    <div>
      {/* Welcome Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Welcome back, {user?.name}! 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Pick up right where you left off in your learning track.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {dashboard?.courses?.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Compass size={48} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>No Active Courses</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '400px', margin: '6px auto 0' }}>
            You haven't been enrolled in any courses yet. Ask your course administrator for an invitation link to start learning.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {dashboard?.courses?.map((c) => (
            <div key={c.enrollmentId} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{c.course.title}</h2>
                    <span className="badge badge-published">{c.course.difficulty}</span>
                    <span className="badge badge-draft">{c.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Progress: <strong>{c.progressPercentage}%</strong></span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (onSelectCourse) onSelectCourse(c.course, c.enrollmentId);
                    onNavigate('learning-path');
                  }}
                >
                  View Full Path
                </button>
              </div>

              {/* Progress Bar */}
              <div className="progress-container" style={{ height: '8px', marginBottom: '20px' }}>
                <div className="progress-bar" style={{ width: `${c.progressPercentage}%` }}></div>
              </div>

              {/* Recommended Next Action Banner */}
              <div
                style={{
                  background: 'var(--primary-light)',
                  border: '1px solid #c7d2fe',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#fff', borderRadius: '8px', color: 'var(--primary)' }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      RECOMMENDED NEXT ACTION
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {c.currentModule ? `${c.currentModule.title} — ` : ''}
                      {c.currentLesson ? c.currentLesson.title : 'Take Assignment or Review'}
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => handleActionClick(c)}>
                  <PlayCircle size={16} />
                  <span>
                    {c.recommendedAction === 'open_assignment'
                      ? 'Open Assignment'
                      : c.recommendedAction === 'revise_submission'
                      ? 'Revise Work'
                      : c.recommendedAction === 'take_understanding_check'
                      ? 'Take Practice Check'
                      : 'Continue Lesson'}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

