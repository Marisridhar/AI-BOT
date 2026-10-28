import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  Compass,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  Code,
  CheckSquare,
  HelpCircle,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';

export const LearningPath = ({ activeEnrollmentId, onNavigate, onSelectTask }) => {
  const [outline, setOutline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  // Understanding check attempt state
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [completionMsg, setCompletionMsg] = useState(null);

  useEffect(() => {
    if (activeEnrollmentId) {
      loadOutline(activeEnrollmentId);
    } else {
      findDefaultEnrollment();
    }
  }, [activeEnrollmentId]);

  const findDefaultEnrollment = async () => {
    try {
      const dash = await api.getStudentDashboard();
      if (dash.courses && dash.courses.length > 0) {
        const enrId = dash.courses[0].enrollmentId;
        loadOutline(enrId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.warn(err);
      setLoading(false);
    }
  };

  const loadOutline = async (enrId) => {
    setLoading(true);
    try {
      const data = await api.getStudentOutline(enrId);
      setOutline(data);
    } catch (err) {
      console.warn('Error loading learning outline:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLesson = async (lesson, moduleId) => {
    setLessonLoading(true);
    setSelectedAnswer('');
    setCheckResult(null);
    setCompletionMsg(null);

    try {
      // 1. Start lesson
      await api.startLesson(lesson.id, outline.enrollmentId).catch(() => {});
      // 2. Fetch full content
      const content = await api.getLessonContent(lesson.id, outline.enrollmentId);
      setSelectedLesson({ ...content, moduleId });
    } catch (err) {
      alert(`Cannot open lesson: ${err.message}`);
    } finally {
      setLessonLoading(false);
    }
  };

  const handleSubmitCheck = async (question) => {
    if (!selectedAnswer || !selectedLesson) return;
    setChecking(true);
    try {
      const res = await api.submitUnderstandingCheck(
        selectedLesson._id,
        outline.enrollmentId,
        question.id,
        selectedAnswer
      );
      setCheckResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!selectedLesson) return;
    try {
      await api.completeLesson(selectedLesson._id, outline.enrollmentId);
      setCompletionMsg('🎉 Lesson completed! Progress updated.');
      loadOutline(outline.enrollmentId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAssignment = async (assignment) => {
    try {
      const started = await api.startAssignmentTask(assignment.id, outline.enrollmentId);
      if (onSelectTask) {
        onSelectTask(started.taskRunId);
      }
      onNavigate('assignment-workspace');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading learning path...</p>;
  }

  if (!outline) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p>No enrolled course outline available.</p>
        <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => onNavigate('student-dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={24} color="var(--primary)" />
            <span>Interactive Learning Path</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Follow the sequential curriculum. Modules and assignments unlock automatically as you progress.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overall Progress: {outline.overallProgress}%</div>
          <div className="progress-container" style={{ width: '140px', height: '6px', margin: '4px 0 0' }}>
            <div className="progress-bar" style={{ width: `${outline.overallProgress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid-cols-3">
        {/* Left 1 Col: Modules & Lessons Timeline Outline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {outline.modules?.map((mod, i) => {
            const isLocked = mod.status === 'locked';
            const isCompleted = mod.status === 'completed';

            return (
              <div
                key={mod.id}
                className="card"
                style={{
                  marginBottom: 0,
                  opacity: isLocked ? 0.75 : 1,
                  borderLeft: `4px solid ${
                    isCompleted ? 'var(--success)' : isLocked ? 'var(--text-muted)' : 'var(--primary)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCompleted ? (
                      <CheckCircle2 size={18} color="var(--success)" />
                    ) : isLocked ? (
                      <Lock size={18} color="var(--text-muted)" />
                    ) : (
                      <PlayCircle size={18} color="var(--primary)" />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {i + 1}. {mod.title}
                    </span>
                  </div>
                  <span className={`badge badge-${mod.status}`}>{mod.status}</span>
                </div>

                {isLocked ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    🔒 Complete previous modules to unlock.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    {/* Lessons list */}
                    {mod.lessons?.map((les) => (
                      <button
                        key={les.id}
                        onClick={() => handleOpenLesson(les, mod.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          background: selectedLesson?._id === les.id ? 'var(--primary-light)' : '#f8fafc',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '0.84rem'
                        }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {les.title}
                        </span>
                        {les.status === 'completed' && (
                          <CheckCircle2 size={14} color="var(--success)" />
                        )}
                      </button>
                    ))}

                    {/* Module Assignments */}
                    {mod.assignments?.map((ass) => (
                      <div
                        key={ass.id}
                        style={{
                          marginTop: '6px',
                          padding: '8px 10px',
                          background: '#fff',
                          border: '1px dashed var(--primary)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)' }}>
                          📝 {ass.title}
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          onClick={() => handleOpenAssignment(ass)}
                        >
                          Workspace
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right 2 Cols: Lesson Content & Interactive Checks */}
        <div style={{ gridColumn: 'span 2' }}>
          {!selectedLesson ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Select a lesson to begin learning
              </h3>
              <p style={{ fontSize: '0.88rem', marginTop: '4px' }}>
                Click any available lesson from the outline on the left to read notes, examine code examples, and take understanding checks.
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedLesson.title}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <Clock size={13} />
                    <span>{selectedLesson.estimatedMinutes || 15} mins</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate('mentor')}
                  title="Ask AI Mentor for help"
                >
                  <Sparkles size={14} color="var(--primary)" />
                  <span>Discuss with AI Mentor</span>
                </button>
              </div>

              {completionMsg && (
                <div style={{ padding: '10px 14px', background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontWeight: 600, fontSize: '0.9rem' }}>
                  {completionMsg}
                </div>
              )}

              {/* Lesson Content Blocks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {selectedLesson.contentBlocks?.map((block, idx) => (
                  <div key={idx}>
                    {block.type === 'text' && (
                      <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                        {block.content}
                      </p>
                    )}

                    {block.type === 'code' && (
                      <pre
                        className="code-editor"
                        style={{
                          padding: '14px 16px',
                          borderRadius: '6px',
                          overflowX: 'auto',
                          margin: 0
                        }}
                      >
                        <code>{block.content}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>

              {/* Interactive Understanding Checks */}
              {selectedLesson.understandingCheckConfig?.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <HelpCircle size={18} color="var(--primary)" />
                    <span>Understanding Check</span>
                  </h3>

                  {selectedLesson.understandingCheckConfig.map((q) => (
                    <div key={q.id}>
                      <p style={{ fontWeight: 500, fontSize: '0.92rem', marginBottom: '10px' }}>{q.prompt}</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {q.options?.map((opt, i) => (
                          <label
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: selectedAnswer === opt ? 'var(--primary-light)' : '#fff',
                              border: `1px solid ${selectedAnswer === opt ? 'var(--primary)' : 'var(--border)'}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              checked={selectedAnswer === opt}
                              onChange={(e) => setSelectedAnswer(e.target.value)}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSubmitCheck(q)}
                          disabled={!selectedAnswer || checking}
                        >
                          {checking ? 'Checking...' : 'Verify Answer'}
                        </button>

                        {checkResult && (
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: checkResult.passed ? 'var(--success)' : 'var(--danger)' }}>
                            {checkResult.feedback}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Complete Lesson CTA */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button className="btn btn-success" onClick={handleCompleteLesson}>
                  <CheckCircle2 size={16} />
                  <span>Mark Lesson Complete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningPath;

