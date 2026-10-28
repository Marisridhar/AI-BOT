import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  Code,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Link
} from 'lucide-react';

export const AssignmentWorkspace = ({ taskRunId, onNavigate, onReviewReceived }) => {
  const [taskData, setTaskData] = useState(null);
  const [codeText, setCodeText] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (taskRunId) {
      loadTask(taskRunId);
    } else {
      // Find default active task
      findActiveTask();
    }
  }, [taskRunId]);

  const findActiveTask = async () => {
    setLoading(true);
    try {
      const dash = await api.getStudentDashboard();
      if (dash.courses && dash.courses.length > 0) {
        const firstCourse = dash.courses[0];
        const outline = await api.getStudentOutline(firstCourse.enrollmentId);
        const activeModule = outline.modules?.find((m) => m.status === 'in_progress' || m.status === 'available');
        const assignment = activeModule?.assignments?.[0];

        if (assignment) {
          const started = await api.startAssignmentTask(assignment.id, firstCourse.enrollmentId);
          setTaskData(started);
        }
      }
    } catch (err) {
      setError(err.message || 'No active assignment found.');
    } finally {
      setLoading(false);
    }
  };

  const loadTask = async (id) => {
    setLoading(true);
    try {
      const data = await api.getTaskDetails(id);
      setTaskData(data);
    } catch (err) {
      setError(err.message || 'Failed to load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeTaskId = taskData?.taskRunId || taskData?.taskId || taskRunId;
    if (!activeTaskId || !codeText.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitAssignment(activeTaskId, codeText, repositoryUrl);
      if (onReviewReceived) {
        onReviewReceived(result.review, result.submission);
      }
      onNavigate('review-feedback');
    } catch (err) {
      setError(err.message || 'Submission failed. Please check your code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading assignment workspace...</p>;
  }

  const assignment = taskData?.assignment;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {assignment?.title || 'Assignment Workspace'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Implement your solution against requirements and submit for AI-assisted review.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('learning-path')}>
          Back to Learning Path
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Left Panel: Briefing, Scenario, Rubric */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} />
              <span>Project Brief &amp; Scenario</span>
            </h3>
            <span className="badge badge-published">Active Challenge</span>
          </div>

          <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '6px', borderLeft: '4px solid var(--primary)', marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                SCENARIO BRIEF
              </h4>
              <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{assignment?.scenarioText}</p>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>Core Requirements:</h4>
            <ul style={{ paddingLeft: '20px', marginBottom: '18px', color: 'var(--text-secondary)' }}>
              {assignment?.requirements?.map((req, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{req}</li>
              ))}
            </ul>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>Expected Outcome:</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>{assignment?.expectedOutcome}</p>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>Grading Rubric:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assignment?.rubric?.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Code Submission */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={18} />
              <span>Submit Your Code</span>
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Source Code Implementation</label>
              <textarea
                className="form-control code-editor"
                rows={16}
                placeholder="// Write or paste your solution code here...&#10;&#10;function solution() {&#10;  // Your implementation&#10;}"
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Link size={14} />
                <span>Repository URL (Optional)</span>
              </label>
              <input
                type="url"
                className="form-control"
                placeholder="https://github.com/your-username/my-project"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={submitting || !codeText.trim()}
            >
              <Sparkles size={18} />
              <span>{submitting ? 'Evaluating with Gemini AI...' : 'Submit for AI Review'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignmentWorkspace;

