# AI Bot — Complete AI-Powered Personalised Learning Platform

AI Bot is a Node.js & Express backend architecture that powers a complete, personalised, AI-driven learning lifecycle:

**Admin creates course → Student enrols → AI teaches lessons → Student completes understanding checks → Assignment unlocks → Student submits work → Gemini evaluates → Student revises if necessary → Backend approves work → Next module unlocks.**

---

## 🏗️ Architectural Overview & Domain Models

### Data Models & Relationships

```
              ┌──────────────┐
              │    Course    │
              └──────┬───────┘
                     │ 1:N
                     ▼
              ┌──────────────┐
              │    Module    │◄──────────────┐ (Prerequisites)
              └──────┬───────┘               │
                     │ 1:N                   │
         ┌───────────┴───────────┐           │
         ▼                       ▼           │
  ┌──────────────┐        ┌──────────────┐   │
  │    Lesson    │        │  Assignment  │   │
  └──────┬───────┘        └──────┬───────┘   │
         │                       │           │
         │                       ▼           │
         │                ┌──────────────┐   │
         │                │   TaskRun    │   │
         │                └──────┬───────┘   │
         │                       │ 1:N       │
         │                       ▼           │
         │                ┌──────────────┐   │
         │                │  Submission  │   │
         │                └──────┬───────┘   │
         │                       │ 1:1       │
         │                       ▼           │
         │                ┌──────────────┐   │
         │                │    Review    │───┘ (Approval unlocks next module)
         │                └──────────────┘
         ▼
┌──────────────────┐
│  LessonProgress  │
└──────────────────┘
```

1. **User**: Secure user identity (`admin` or `student`) with salted bcrypt password hashing, invitation tokens, and JWT authentication.
2. **Course**: Complete syllabus with versioning, learning objectives, difficulty, and draft/published/archived lifecycle.
3. **Module**: Ordered unit within a course with prerequisite validation and circular-dependency defense.
4. **Lesson**: Structured learning blocks (text, code, demos, practice, resources) with admin-authored understanding checks.
5. **Assignment**: Course/module-scoped challenge with rubric weights totaling 100, attempt limits, and private `answerKey` (`select: false`).
6. **CourseEnrollment**: Unique enrollment link between student and course with overall progress tracking.
7. **ModuleProgress**: State machine (`locked`, `available`, `in_progress`, `needs_revision`, `completed`) governed strictly by backend progression rules.
8. **LessonProgress**: Tracks lesson engagement, understanding check attempts, and completion timestamp.
9. **TaskRun**: Student's instance of an assignment tracking attempt count, version snapshot, and status.
10. **Submission**: Immutable attempt history with size limits (500k chars) and repository URL validation.
11. **Review**: Structured AI evaluation report with score, verdict, strengths, issues, suggestions, and approval decision (`approved` vs `needs_revision`).
12. **Conversation & ChatMessage**: Scoped AI mentor discussions with bounded course context.
13. **EmailLog**: Idempotent delivery tracking preventing duplicate emails on retries.

---

## 🔒 Authoritative Progression Engine Rules

1. **Backend Owns Progression**: Gemini recommends actions, but only the backend validates criteria and updates status.
2. **Access Control**: A student cannot access a locked module or lesson simply by sending request payloads.
3. **Lesson Completion**: Requires that all configured understanding checks are answered correctly.
4. **Assignment Unlocking**: An assignment unlocks only after all required lessons in its module are completed.
5. **Module Completion & Unlocking**:
   - All required lessons in the module are completed.
   - All mandatory understanding checks are passed.
   - All module assignments are approved (`score >= 70`).
   - Dependent modules automatically transition from `locked` to `available`.

---

## 🤖 AI Mentor & Prompt Defense

- Context selection is strictly bounded to the student's current lesson, module, and actual progress.
- Student messages and submitted codes are treated as untrusted text. Instructions attempting to override system behavior are ignored.
- **Privacy Guarantee**: The private `answerKey` is excluded from all student APIs and is **never** injected into the mentor's prompt.

---

## 📡 REST API Directory

### 1. Authentication (`/api/auth`)
- `POST /register` — Register a student or admin user.
- `POST /login` — Authenticate and receive JWT token + HttpOnly cookie.
- `POST /logout` — Clear session cookie.
- `GET /me` — Current authenticated user profile.
- `POST /accept-invitation` — Accept course invitation token and set password.

### 2. Admin Management (`/api/admin`)
- **Courses**:
  - `POST /courses` — Create draft course.
  - `GET /courses` — List courses.
  - `GET /courses/:courseId` — Course details.
  - `PATCH /courses/:courseId` — Update course metadata.
  - `POST /courses/:courseId/publish` — Validate and publish course.
  - `POST /courses/:courseId/archive` — Archive course.
  - `POST /courses/:courseId/prepare` — Validate course structure before publication.
- **Modules**:
  - `POST /courses/:courseId/modules` — Add module with order and prerequisites.
  - `GET /courses/:courseId/modules` — List modules in order.
  - `GET /modules/:moduleId` — Module details.
  - `PATCH /modules/:moduleId` — Update module.
  - `DELETE /modules/:moduleId` — Controlled deletion with dependency checks.
  - `PATCH /courses/:courseId/modules/reorder` — Reorder modules safely.
- **Lessons**:
  - `POST /modules/:moduleId/lessons` — Add structured lesson.
  - `GET /modules/:moduleId/lessons` — List lessons.
  - `GET /lessons/:lessonId` — Get lesson.
  - `PATCH /lessons/:lessonId` — Update lesson.
  - `DELETE /lessons/:lessonId` — Delete lesson.
  - `PATCH /modules/:moduleId/lessons/reorder` — Reorder lessons.
- **Enrollments**:
  - `POST /courses/:courseId/enroll` — Invite student to course via email.
  - `GET /courses/:courseId/enrollments` — List enrollments.
  - `GET /enrollments/:enrollmentId/progress` — View student progress.
  - `POST /enrollments/:enrollmentId/revoke` — Revoke enrollment.
- **Assignments & Reviews**:
  - `POST /assignments` — Create assignment.
  - `GET /assignments` — List assignments (excluding `answerKey`).
  - `GET /submissions/:submissionId/review` — Inspect review.
  - `POST /submissions/:submissionId/retry-email` — Retry review email delivery.

### 3. Student Learning (`/api/student`)
- **Dashboard**:
  - `GET /dashboard` — Aggregated dashboard with active courses, current lesson, progress %, and recommended next action.
  - `GET /courses/:courseId` — Course details.
  - `GET /enrollments/:enrollmentId/outline` — Course outline with lock/available statuses.
- **Lessons & Checks**:
  - `GET /lessons/:lessonId` — Permitted lesson content (locked if module/prereqs incomplete).
  - `POST /lessons/:lessonId/start` — Mark lesson in progress.
  - `POST /lessons/:lessonId/understanding-check` — Submit check response.
  - `POST /lessons/:lessonId/complete` — Complete lesson after required checks pass.
  - `GET /lessons/:lessonId/progress` — Saved lesson progress.
- **Assignments & Reviews**:
  - `GET /assignments/:taskRunId` — Assignment scenario and instructions (no `answerKey`).
  - `POST /assignments/:taskRunId/submissions` — Submit code, trigger AI review, and update progression.
  - `GET /assignments/:taskRunId/submissions` — Submission attempt history.
  - `GET /submissions/:submissionId/review` — Review report.
- **AI Mentor**:
  - `POST /mentor/conversations` — Start scoped conversation.
  - `GET /mentor/conversations` — List student conversations.
  - `GET /mentor/conversations/:id/messages` — Paginated message history.
  - `POST /mentor/conversations/:id/messages` — Send message and receive contextual guidance.

### 4. Health Check (`/api/health`)
- `GET /health` — Service readiness (database, Gemini, SMTP, Admin).

---

## 🧪 Testing

The repository includes a complete automated test suite covering all 24 core lifecycle behaviors:

```bash
cd server
npm test
```

### Test Suite Summary
- **12 Legacy Tests**: Health check, rubric validation, token hashing, answer key concealment, state transitions, duplicate review prevention, email retry, and chaining.
- **12 Learning Platform Tests**: User registration & login, course draft & publishing validation, circular prerequisite prevention, enrollment invitations, module locking, contextual AI mentor conversations without answer key leakage, understanding check verification, assignment evaluation, automatic module unlocking upon approval, dashboard aggregation, and cross-student security authorization checks.

---

## 🚀 Running the Server

```bash
cd server

# Development with hot reload
npm run dev

# Production
npm start
```
