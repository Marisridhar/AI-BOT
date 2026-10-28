import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  Plus,
  BookOpen,
  Layers,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Trash2,
  Send,
  Sparkles
} from 'lucide-react';

export const CourseBuilder = ({ selectedCourse, onSelectCourse, onNavigate, onSelectModule }) => {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(selectedCourse || null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [objectives, setObjectives] = useState('');

  // New module state
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModulePrereq, setNewModulePrereq] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (activeCourse) {
      setTitle(activeCourse.title || '');
      setDescription(activeCourse.description || '');
      setDifficulty(activeCourse.difficulty || 'beginner');
      setObjectives((activeCourse.learningObjectives || []).join('\n'));
      loadModules(activeCourse._id);
    }
  }, [activeCourse]);

  const loadCourses = async () => {
    try {
      const data = await api.getAdminCourses();
      setCourses(data || []);
      if (!activeCourse && data && data.length > 0) {
        setActiveCourse(data[0]);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const loadModules = async (courseId) => {
    try {
      const data = await api.getModules(courseId);
      setModules(data || []);
    } catch (err) {
      console.warn('Error loading modules:', err.message);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const learningObjectives = objectives
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await api.createCourse({
        title,
        description,
        difficulty,
        learningObjectives
      });

      setMsg({ type: 'success', text: 'Course created successfully!' });
      setActiveCourse(created);
      loadCourses();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!activeCourse) return;
    setLoading(true);
    setMsg(null);

    try {
      const prerequisiteModuleIds = newModulePrereq ? [newModulePrereq] : [];
      await api.createModule(activeCourse._id, {
        title: newModuleTitle,
        description: newModuleDesc,
        prerequisiteModuleIds,
        order: modules.length + 1
      });

      setNewModuleTitle('');
      setNewModuleDesc('');
      setNewModulePrereq('');
      setMsg({ type: 'success', text: 'Module added successfully!' });
      loadModules(activeCourse._id);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!confirm('Are you sure you want to delete this module and its content?')) return;
    try {
      await api.deleteModule(moduleId);
      setMsg({ type: 'success', text: 'Module deleted.' });
      loadModules(activeCourse._id);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handlePublishCourse = async () => {
    if (!activeCourse) return;
    setLoading(true);
    setMsg(null);
    try {
      const updated = await api.publishCourse(activeCourse._id);
      setActiveCourse(updated);
      setMsg({ type: 'success', text: '🎉 Course published successfully! Students can now enroll.' });
      loadCourses();
    } catch (err) {
      setMsg({
        type: 'error',
        text: `Publishing failed: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Course Builder</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Structure curriculum modules, lessons, and assignments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setActiveCourse(null);
              setTitle('');
              setDescription('');
              setObjectives('');
              setModules([]);
            }}
          >
            <Plus size={16} />
            <span>New Course</span>
          </button>
          {activeCourse && activeCourse.status !== 'published' && (
            <button className="btn btn-success" onClick={handlePublishCourse} disabled={loading}>
              <Send size={16} />
              <span>Validate &amp; Publish Course</span>
            </button>
          )}
        </div>
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

      {/* Course Switcher Tabs */}
      {courses.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {courses.map((c) => (
            <button
              key={c._id}
              onClick={() => setActiveCourse(c)}
              className={`btn btn-sm ${activeCourse?._id === c._id ? 'btn-primary' : 'btn-secondary'}`}
            >
              <span>{c.title}</span>
              <span className={`badge badge-${c.status}`}>{c.status}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid-cols-2">
        {/* Left: Course Details Form */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            {activeCourse ? 'Edit Course Details' : 'Create New Course'}
          </h3>

          <form onSubmit={handleCreateCourse}>
            <div className="form-group">
              <label className="form-label">Course Title</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Master Modern Python & Web Development"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                placeholder="Detailed curriculum overview..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select
                className="form-control"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Learning Objectives (one per line)</label>
              <textarea
                className="form-control"
                placeholder="Understand functions and scopes&#10;Build REST APIs&#10;Write unit tests"
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {activeCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </form>
        </div>

        {/* Right: Modules & Progression */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Curriculum Modules</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{modules.length} Modules</span>
          </div>

          {!activeCourse ? (
            <p style={{ color: 'var(--text-muted)' }}>Save or select a course to add modules.</p>
          ) : (
            <div>
              {/* Existing Modules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {modules.map((mod, idx) => (
                  <div
                    key={mod._id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {idx + 1}. {mod.title}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {mod.description || 'No description.'}
                        </div>
                        {mod.prerequisiteModuleIds && mod.prerequisiteModuleIds.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--warning-text)', marginTop: '4px' }}>
                            Prerequisites configured
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            if (onSelectModule) onSelectModule(mod);
                            onNavigate('lesson-editor');
                          }}
                        >
                          Lessons
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            if (onSelectModule) onSelectModule(mod);
                            onNavigate('assignment-builder');
                          }}
                        >
                          Assignment
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteModule(mod._id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Module Form */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '10px' }}>Add Module</h4>
                <form onSubmit={handleAddModule}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Module title (e.g. Module 2: Express Databases)"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Short description"
                      value={newModuleDesc}
                      onChange={(e) => setNewModuleDesc(e.target.value)}
                    />
                  </div>

                  {modules.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Prerequisite Module (Optional)</label>
                      <select
                        className="form-control"
                        value={newModulePrereq}
                        onChange={(e) => setNewModulePrereq(e.target.value)}
                      >
                        <option value="">No prerequisite</option>
                        {modules.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
                    Add Module to Course
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseBuilder;

