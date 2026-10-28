import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  Users,
  Mail,
  UserPlus,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award,
  RefreshCw
} from 'lucide-react';

export const StudentProgress = ({ onNavigate }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [studentOutline, setStudentOutline] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadEnrollments(selectedCourseId);
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      const data = await api.getAdminCourses();
      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0]._id);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const loadEnrollments = async (courseId) => {
    setLoading(true);
    try {
      const list = await api.getEnrollments(courseId);
      setEnrollments(list || []);
      setSelectedEnrollment(null);
      setStudentOutline(null);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    setLoading(true);
    setMsg(null);
    setInviteToken('');

    try {
      const result = await api.inviteStudent(selectedCourseId, {
        email: inviteEmail,
        name: inviteName
      });

      setMsg({ type: 'success', text: `Invitation sent to ${inviteEmail}!` });
      if (result.rawToken) {
        setInviteToken(result.rawToken);
      }
      setInviteEmail('');
      setInviteName('');
      loadEnrollments(selectedCourseId);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInspectStudent = async (enrollment) => {
    setSelectedEnrollment(enrollment);
    try {
      const progress = await api.getEnrollmentProgress(enrollment._id);
      setStudentOutline(progress);
    } catch (err) {
      console.warn('Error loading student progress:', err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Student Progress &amp; Enrolments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Monitor student completion rates, milestones, and invite new learners.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => loadEnrollments(selectedCourseId)}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 16px',
            background: msg.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
            color: msg.type === 'error' ? 'var(--danger-text)' : 'var(--success-text)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {inviteToken && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '20px' }}>
          <h4 style={{ color: '#166534', fontWeight: 600, marginBottom: '6px' }}>Student Invitation Token Generated</h4>
          <p style={{ fontSize: '0.85rem', color: '#15803d' }}>
            Invitation email dispatched. For development/testing without inbox, use this token:
          </p>
          <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fff', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
            {inviteToken}
          </div>
        </div>
      )}

      {/* Course Filter */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ maxWidth: '400px' }}>
          <label className="form-label">Filter by Course</label>
          <select
            className="form-control"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-cols-3">
        {/* Enrolled Students Table (2 cols) */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Enrolled Students ({enrollments.length})</h3>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading student enrolments...</p>
            ) : enrollments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No students enrolled in this course yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {enrollments.map((enr) => {
                  const student = enr.studentId;
                  const isSelected = selectedEnrollment?._id === enr._id;
                  return (
                    <div
                      key={enr._id}
                      style={{
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isSelected ? 'var(--primary-light)' : '#fff',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleInspectStudent(enr)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{student?.name || 'Invited User'}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{student?.email}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{enr.overallProgress || 0}% Complete</div>
                          <div className="progress-container" style={{ width: '100px', height: '6px', margin: '4px 0 0' }}>
                            <div className="progress-bar" style={{ width: `${enr.overallProgress || 0}%` }}></div>
                          </div>
                        </div>

                        <span className={`badge badge-${enr.status}`}>{enr.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student Progress Breakdown Panel */}
          {studentOutline && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">Progress Breakdown: {selectedEnrollment?.studentId?.name}</h3>
                <span className="badge badge-published">{studentOutline.overallProgress}% Overall</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {studentOutline.modules?.map((mod, i) => (
                  <div key={mod.id} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>Module {i + 1}: {mod.title}</span>
                      <span className={`badge badge-${mod.status}`}>{mod.status}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Lessons: {mod.lessons?.filter((l) => l.status === 'completed').length} / {mod.lessons?.length || 0} completed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invite Student Card (1 col) */}
        <div>
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <UserPlus size={18} />
              <span>Invite Student</span>
            </h3>

            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Student Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Alex Johnson"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="student@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                <Mail size={16} /> Send Invitation
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;

