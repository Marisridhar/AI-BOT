import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  CheckSquare,
  Plus,
  Trash2,
  Lock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export const AssignmentBuilder = ({ selectedModule, onNavigate }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [modules, setModules] = useState([]);
  const [currentModuleId, setCurrentModuleId] = useState(selectedModule?._id || '');
  const [assignments, setAssignments] = useState([]);

  // Assignment form states
  const [title, setTitle] = useState('');
  const [scenarioText, setScenarioText] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [requirements, setRequirements] = useState(['']);
  const [answerKey, setAnswerKey] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);

  // Rubric
  const [rubric, setRubric] = useState([
    { name: 'Functional Correctness', description: 'Meets core requirements', weight: 50 },
    { name: 'Code Quality & Validation', description: 'Handles errors and edge cases', weight: 50 }
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadCoursesAndAssignments();
  }, []);

  const loadCoursesAndAssignments = async () => {
    try {
      const [courseList, assignmentList] = await Promise.all([
        api.getAdminCourses(),
        api.getAdminAssignments().catch(() => [])
      ]);
      setCourses(courseList || []);
      setAssignments(assignmentList || []);

      if (courseList && courseList.length > 0) {
        const initialCourse = courseList[0];
        setSelectedCourseId(initialCourse._id);
        const modList = await api.getModules(initialCourse._id);
        setModules(modList || []);
        if (!currentModuleId && modList && modList.length > 0) {
          setCurrentModuleId(modList[0]._id);
        }
      }
    } catch (err) {
      console.warn('Error loading courses/assignments:', err.message);
    }
  };

  const handleCourseChange = async (courseId) => {
    setSelectedCourseId(courseId);
    try {
      const modList = await api.getModules(courseId);
      setModules(modList || []);
      if (modList && modList.length > 0) {
        setCurrentModuleId(modList[0]._id);
      } else {
        setCurrentModuleId('');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Requirements handlers
  const addRequirement = () => setRequirements([...requirements, '']);
  const updateRequirement = (index, value) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };
  const removeRequirement = (index) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  // Rubric handlers
  const addRubricRow = () => {
    setRubric([...rubric, { name: '', description: '', weight: 10 }]);
  };
  const updateRubricRow = (index, field, value) => {
    const updated = [...rubric];
    updated[index][field] = field === 'weight' ? Number(value) : value;
    setRubric(updated);
  };
  const removeRubricRow = (index) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };

  const totalRubricWeight = rubric.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const isRubricValid = Math.abs(totalRubricWeight - 100) < 0.001;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRubricValid) {
      setMsg({ type: 'error', text: `Rubric weights must sum to exactly 100. Current total is ${totalRubricWeight}.` });
      return;
    }

    const filteredReqs = requirements.map((r) => r.trim()).filter(Boolean);
    if (filteredReqs.length === 0) {
      setMsg({ type: 'error', text: 'Please provide at least one requirement.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      await api.createAssignment({
        courseId: selectedCourseId || null,
        moduleId: currentModuleId || null,
        title,
        scenarioText,
        expectedOutcome,
        requirements: filteredReqs,
        answerKey,
        rubric,
        maxAttempts: Number(maxAttempts) || 3,
        status: 'published'
      });

      setMsg({ type: 'success', text: 'Assignment created and published successfully!' });
      setTitle('');
      setScenarioText('');
      setExpectedOutcome('');
      setRequirements(['']);
      setAnswerKey('');

      // Reload assignments
      const updatedList = await api.getAdminAssignments();
      setAssignments(updatedList || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Assignment Builder</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Configure practical challenges, reference answer keys, and grading rubrics.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('course-builder')}>
          Back to Course Builder
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

      {/* Target Module Picker */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Course</label>
            <select
              className="form-control"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
              <option value="">No Course (Standalone)</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label className="form-label">Module</label>
            <select
              className="form-control"
              value={currentModuleId}
              onChange={(e) => setCurrentModuleId(e.target.value)}
            >
              <option value="">No Module</option>
              {modules.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid-cols-3">
        {/* Authoring Form (2 cols) */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Configure Assignment</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Assignment Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Build an Asynchronous Data Fetcher"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Scenario Text</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Describe the real-world business context or problem statement..."
                  value={scenarioText}
                  onChange={(e) => setScenarioText(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Outcome</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Exported function fetchData(url) returning parsed data with retry logic."
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  required
                />
              </div>

              {/* Requirements */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Requirements</h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addRequirement}>
                    <Plus size={14} /> Add Requirement
                  </button>
                </div>

                {requirements.map((req, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Requirement #${idx + 1}`}
                      value={req}
                      onChange={(e) => updateRequirement(idx, e.target.value)}
                      required
                    />
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => removeRequirement(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Rubric Configuration */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Grading Rubric</h4>
                    <span style={{ fontSize: '0.82rem', color: isRubricValid ? 'var(--success)' : 'var(--danger)' }}>
                      Total Weight: {totalRubricWeight}% {isRubricValid ? '(Valid)' : '(Must equal 100%)'}
                    </span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addRubricRow}>
                    <Plus size={14} /> Add Criterion
                  </button>
                </div>

                {rubric.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Criterion Name"
                      value={item.name}
                      onChange={(e) => updateRubricRow(idx, 'name', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Description / expectations"
                      value={item.description}
                      onChange={(e) => updateRubricRow(idx, 'description', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Weight %"
                      min="1"
                      max="100"
                      value={item.weight}
                      onChange={(e) => updateRubricRow(idx, 'weight', e.target.value)}
                      required
                    />
                    {rubric.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => removeRubricRow(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Private Answer Key */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Lock size={16} color="var(--primary)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Private Reference Answer (Answer Key)</h4>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} />
                  <span>Confidential. Stored securely and NEVER exposed to student APIs or AI mentor context.</span>
                </div>
                <textarea
                  className="form-control code-editor"
                  rows={8}
                  placeholder="// Paste expected standard implementation here for Gemini to evaluate against..."
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
                disabled={loading || !isRubricValid}
              >
                {loading ? 'Publishing...' : 'Save & Publish Assignment'}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Assignments (1 col) */}
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>Existing Assignments</h3>
            {assignments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No assignments created yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {assignments.map((ass) => (
                  <div
                    key={ass._id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ass.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {ass.requirements?.length || 0} Requirements • {ass.rubric?.length || 0} Rubric criteria
                    </div>
                    <span className="badge badge-published" style={{ marginTop: '6px' }}>{ass.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentBuilder;

