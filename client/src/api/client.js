// Centralized API Client for AI Bot Learning Platform
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('aibot_token') || null;
    this.adminApiKey = localStorage.getItem('aibot_admin_key') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('aibot_token', token);
    } else {
      localStorage.removeItem('aibot_token');
    }
  }

  setAdminApiKey(key) {
    this.adminApiKey = key;
    if (key) {
      localStorage.setItem('aibot_admin_key', key);
    } else {
      localStorage.removeItem('aibot_admin_key');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.adminApiKey) {
      headers['x-admin-api-key'] = this.adminApiKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const error = json?.error || {
          code: `HTTP_${response.status}`,
          message: json?.message || response.statusText || 'Request failed'
        };

        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          this.setToken(null);
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        const err = new Error(error.message);
        err.code = error.code;
        err.status = response.status;
        err.details = error.details;
        throw err;
      }

      return json?.data !== undefined ? json.data : json;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = new Error('Cannot connect to AI Bot server. Ensure server is running at http://localhost:5000');
        netErr.code = 'NETWORK_ERROR';
        throw netErr;
      }
      throw err;
    }
  }

  // Auth APIs
  async register(data) {
    const res = await this.request('/auth/register', { method: 'POST', body: data });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(data) {
    const res = await this.request('/auth/login', { method: 'POST', body: data });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async acceptInvitation(data) {
    const res = await this.request('/auth/accept-invitation', { method: 'POST', body: data });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // Health
  async getHealth() {
    return this.request('/health');
  }

  // Admin APIs
  async getAdminCourses(status = '') {
    return this.request(`/admin/courses${status ? `?status=${status}` : ''}`);
  }

  async createCourse(data) {
    return this.request('/admin/courses', { method: 'POST', body: data });
  }

  async getCourse(courseId) {
    return this.request(`/admin/courses/${courseId}`);
  }

  async updateCourse(courseId, data) {
    return this.request(`/admin/courses/${courseId}`, { method: 'PATCH', body: data });
  }

  async publishCourse(courseId) {
    return this.request(`/admin/courses/${courseId}/publish`, { method: 'POST' });
  }

  async prepareCourse(courseId) {
    return this.request(`/admin/courses/${courseId}/prepare`, { method: 'POST' });
  }

  async getModules(courseId) {
    return this.request(`/admin/courses/${courseId}/modules`);
  }

  async createModule(courseId, data) {
    return this.request(`/admin/courses/${courseId}/modules`, { method: 'POST', body: data });
  }

  async updateModule(moduleId, data) {
    return this.request(`/admin/modules/${moduleId}`, { method: 'PATCH', body: data });
  }

  async deleteModule(moduleId) {
    return this.request(`/admin/modules/${moduleId}`, { method: 'DELETE' });
  }

  async getLessons(moduleId) {
    return this.request(`/admin/modules/${moduleId}/lessons`);
  }

  async createLesson(moduleId, data) {
    return this.request(`/admin/modules/${moduleId}/lessons`, { method: 'POST', body: data });
  }

  async updateLesson(lessonId, data) {
    return this.request(`/admin/lessons/${lessonId}`, { method: 'PATCH', body: data });
  }

  async deleteLesson(lessonId) {
    return this.request(`/admin/lessons/${lessonId}`, { method: 'DELETE' });
  }

  async createAssignment(data) {
    return this.request('/admin/assignments', { method: 'POST', body: data });
  }

  async getAdminAssignments() {
    return this.request('/admin/assignments');
  }

  async inviteStudent(courseId, data) {
    return this.request(`/admin/courses/${courseId}/enroll`, { method: 'POST', body: data });
  }

  async getEnrollments(courseId) {
    return this.request(`/admin/courses/${courseId}/enrollments`);
  }

  async getEnrollmentProgress(enrollmentId) {
    return this.request(`/admin/enrollments/${enrollmentId}/progress`);
  }

  // Student APIs
  async getStudentDashboard() {
    return this.request('/student/dashboard');
  }

  async getStudentOutline(enrollmentId) {
    return this.request(`/student/enrollments/${enrollmentId}/outline`);
  }

  async getLessonContent(lessonId, enrollmentId) {
    return this.request(`/student/lessons/${lessonId}${enrollmentId ? `?enrollmentId=${enrollmentId}` : ''}`);
  }

  async startLesson(lessonId, enrollmentId) {
    return this.request(`/student/lessons/${lessonId}/start`, {
      method: 'POST',
      body: { enrollmentId }
    });
  }

  async submitUnderstandingCheck(lessonId, enrollmentId, checkId, answer) {
    return this.request(`/student/lessons/${lessonId}/understanding-check`, {
      method: 'POST',
      body: { enrollmentId, checkId, answer }
    });
  }

  async completeLesson(lessonId, enrollmentId) {
    return this.request(`/student/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: { enrollmentId }
    });
  }

  // Mentor Chat
  async startConversation(data) {
    return this.request('/student/mentor/conversations', { method: 'POST', body: data });
  }

  async getConversations(enrollmentId = null) {
    return this.request(`/student/mentor/conversations${enrollmentId ? `?enrollmentId=${enrollmentId}` : ''}`);
  }

  async getMessages(conversationId) {
    return this.request(`/student/mentor/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId, content) {
    return this.request(`/student/mentor/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content }
    });
  }

  // Assignment Workspace
  async startAssignmentTask(assignmentId, enrollmentId) {
    return this.request(`/student/assignments/${assignmentId}/start`, {
      method: 'POST',
      body: { enrollmentId }
    });
  }

  async getTaskDetails(taskRunId) {
    return this.request(`/student/assignments/${taskRunId}`);
  }

  async submitAssignment(taskRunId, codeText, repositoryUrl) {
    return this.request(`/student/assignments/${taskRunId}/submissions`, {
      method: 'POST',
      body: { codeText, repositoryUrl }
    });
  }

  async getAttempts(taskRunId) {
    return this.request(`/student/assignments/${taskRunId}/submissions`);
  }

  async getReview(submissionId) {
    return this.request(`/student/submissions/${submissionId}/review`);
  }
}

export const api = new ApiClient();
export default api;

