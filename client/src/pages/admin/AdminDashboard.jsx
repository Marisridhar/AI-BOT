import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Activity,
  PlusCircle,
  Users,
  RefreshCw,
  AlertTriangle,
  Server
} from 'lucide-react';

export const AdminDashboard = ({ onNavigate, onSelectCourse }) => {
  const [courses, setCourses] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesData, healthData] = await Promise.all([
        api.getAdminCourses().catch(() => []),
        api.getHealth().catch(() => null)
      ]);
      setCourses(coursesData || []);
      setHealth(healthData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.status === 'published').length;
  const draftCourses = courses.filter((c) => c.status === 'draft').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            High-level overview of curriculum, learning management, and platform health.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadDashboardData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('student-progress')}>
            <Users size={16} />
            <span>Student Progress</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('course-builder')}>
            <PlusCircle size={16} />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL COURSES</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{totalCourses}</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
              <BookOpen size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PUBLISHED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>{publishedCourses}</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DRAFTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: 'var(--info)' }}>{draftCourses}</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--info-bg)', color: 'var(--info)', borderRadius: '8px' }}>
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SYSTEM HEALTH</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px', color: health?.status === 'healthy' ? 'var(--success)' : 'var(--danger)' }}>
                {health?.status ? health.status.toUpperCase() : 'UNKNOWN'}
              </div>
            </div>
            <div style={{ padding: '10px', background: health?.status === 'healthy' ? 'var(--success-bg)' : 'var(--danger-bg)', color: health?.status === 'healthy' ? 'var(--success)' : 'var(--danger)', borderRadius: '8px' }}>
              <Activity size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Courses + System Health */}
      <div className="grid-cols-3">
        {/* Course List (2 cols) */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Curriculum &amp; Courses</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('course-builder')}>
                View Course Builder
              </button>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading courses...</p>
            ) : courses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                <BookOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <p style={{ fontWeight: 500 }}>No courses created yet.</p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={() => onNavigate('course-builder')}
                >
                  Create First Course
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {courses.map((course) => (
                  <div
                    key={course._id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{course.title}</h4>
                        <span className={`badge badge-${course.status}`}>{course.status}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>v{course.version || 1}</span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {course.description || 'No description provided.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (onSelectCourse) onSelectCourse(course);
                          onNavigate('course-builder');
                        }}
                      >
                        Edit Course
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Health Card (1 col) */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} />
                <span>Backend Services</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span>MongoDB Database</span>
                <span className={`badge ${health?.services?.database?.status === 'up' ? 'badge-completed' : 'badge-failed'}`}>
                  {health?.services?.database?.status === 'up' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <div>
                  <div>Gemini AI Engine</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{health?.services?.gemini?.model}</div>
                </div>
                <span className={`badge ${health?.services?.gemini?.configured ? 'badge-completed' : 'badge-warning'}`}>
                  {health?.services?.gemini?.configured ? 'Ready' : 'Not Configured'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span>Nodemailer SMTP</span>
                <span className={`badge ${health?.services?.email?.configured ? 'badge-completed' : 'badge-warning'}`}>
                  {health?.services?.email?.configured ? 'Active' : 'Unconfigured'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Admin Key Security</span>
                <span className={`badge ${health?.services?.admin?.configured ? 'badge-completed' : 'badge-warning'}`}>
                  {health?.services?.admin?.configured ? 'Enforced' : 'Missing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

