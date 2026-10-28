import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  FileText,
  Code,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

export const LessonEditor = ({ selectedModule, onNavigate }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [modules, setModules] = useState([]);
  const [currentModuleId, setCurrentModuleId] = useState(selectedModule?._id || '');
  const [lessons, setLessons] = useState([]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [contentBlocks, setContentBlocks] = useState([
    { type: 'text', content: '', language: '' }
  ]);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionOptions, setQuestionOptions] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadCoursesAndModules();
  }, []);

  useEffect(() => {
    if (currentModuleId) {
      loadLessons(currentModuleId);
    }
  }, [currentModuleId]);

  const loadCoursesAndModules = async () => {
    try {
      const courseList = await api.getAdminCourses();
      setCourses(courseList || []);
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
      console.warn('Error loading courses/modules:', err.message);
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
        setLessons([]);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const loadLessons = async (moduleId) => {
    try {
      const data = await api.getLessons(moduleId);
      setLessons(data || []);
    } catch (err) {
      console.warn('Error loading lessons:', err.message);
    }
  };

  const addContentBlock = (type) => {
    setContentBlocks([...contentBlocks, { type, content: '', language: type === 'code' ? 'javascript' : '' }]);
  };

  const removeContentBlock = (index) => {
    setContentBlocks(contentBlocks.filter((_, i) => i !== index));
  };

  const updateContentBlock = (index, field, value) => {
    const updated = [...contentBlocks];
    updated[index][field] = value;
    setContentBlocks(updated);
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!currentModuleId) {
      setMsg({ type: 'error', text: 'Please select a module first.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const understandingCheckConfig = questionPrompt
        ? [
            {
              id: 'q1',
              prompt: questionPrompt,
              type: 'multiple_choice',
              options: questionOptions.split('\n').map((o) => o.trim()).filter(Boolean),
              expectedAnswer: questionAnswer.trim()
            }
          ]
        : [];

      await api.createLesson(currentModuleId, {
        title,
        description,
        estimatedMinutes: Number(estimatedMinutes) || 15,
        contentBlocks,
        understandingCheckConfig
      });

      setMsg({ type: 'success', text: 'Lesson created successfully!' });
      setTitle('');
      setDescription('');
      setContentBlocks([{ type: 'text', content: '', language: '' }]);
      setQuestionPrompt('');
      setQuestionOptions('');
      setQuestionAnswer('');
      loadLessons(currentModuleId);
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Lesson Editor</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Author structured learning materials, code examples, and practice checks.
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

      {/* Course & Module Selector */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Course</label>
            <select
              className="form-control"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
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
        {/* Left: Authoring Form (2 cols) */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Author Lesson</h3>

            <form onSubmit={handleSaveLesson}>
              <div className="form-group">
                <label className="form-label">Lesson Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Lesson 1.2: Asynchronous Programming & Promises"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Summary</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Short description of concepts covered"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                  />
                </div>
              </div>

              {/* Content Blocks Section */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Lesson Content Blocks</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => addContentBlock('text')}>
                      <FileText size={14} /> Text
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => addContentBlock('code')}>
                      <Code size={14} /> Code Block
                    </button>
                  </div>
                </div>

                {contentBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      marginBottom: '12px',
                      background: block.type === 'code' ? '#f8fafc' : '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Block {idx + 1}: {block.type.toUpperCase()}
                      </span>
                      {block.type === 'code' && (
                        <select
                          className="form-control"
                          style={{ width: '130px', padding: '4px 8px', fontSize: '0.8rem' }}
                          value={block.language}
                          onChange={(e) => updateContentBlock(idx, 'language', e.target.value)}
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="html">HTML</option>
                          <option value="sql">SQL</option>
                        </select>
                      )}
                      {contentBlocks.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => removeContentBlock(idx)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <textarea
                      className={`form-control ${block.type === 'code' ? 'code-editor' : ''}`}
                      rows={block.type === 'code' ? 6 : 4}
                      placeholder={block.type === 'code' ? '// Enter code example here...' : 'Write instructional explanation...'}
                      value={block.content}
                      onChange={(e) => updateContentBlock(idx, 'content', e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Understanding Check Section */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>
                  Interactive Understanding Check (Quiz Question)
                </h4>

                <div className="form-group">
                  <label className="form-label">Question Prompt</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Which keyword resolves a Promise in async functions?"
                    value={questionPrompt}
                    onChange={(e) => setQuestionPrompt(e.target.value)}
                  />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Answer Options (one per line)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="await&#10;resolve&#10;then&#10;yield"
                      value={questionOptions}
                      onChange={(e) => setQuestionOptions(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Answer (Secret / Admin-only)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. await"
                      value={questionAnswer}
                      onChange={(e) => setQuestionAnswer(e.target.value)}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Never sent to the student interface.</small>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
                Save Lesson
              </button>
            </form>
          </div>
        </div>

        {/* Right: Existing Lessons under this module (1 col) */}
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>Lessons in Module</h3>
            {lessons.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No lessons authored yet for this module.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson._id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {idx + 1}. {lesson.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      <span>{lesson.estimatedMinutes} mins</span>
                      <span>•</span>
                      <span>{lesson.contentBlocks?.length || 0} blocks</span>
                    </div>
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

export default LessonEditor;

