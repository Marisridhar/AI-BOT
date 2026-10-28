import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/common/Sidebar.jsx';
import Header from './components/common/Header.jsx';
import AuthPage from './pages/auth/AuthPage.jsx';

// Admin screens
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CourseBuilder from './pages/admin/CourseBuilder.jsx';
import LessonEditor from './pages/admin/LessonEditor.jsx';
import AssignmentBuilder from './pages/admin/AssignmentBuilder.jsx';
import StudentProgress from './pages/admin/StudentProgress.jsx';

// Student screens
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import MentorChat from './pages/student/MentorChat.jsx';
import AssignmentWorkspace from './pages/student/AssignmentWorkspace.jsx';
import ReviewFeedback from './pages/student/ReviewFeedback.jsx';
import LearningPath from './pages/student/LearningPath.jsx';

const MainApp = () => {
  const { user, loading, isAdmin } = useAuth();

  // Screen routing state
  const [currentScreen, setCurrentScreen] = useState(isAdmin ? 'admin-dashboard' : 'student-dashboard');

  // Shared application contexts across screens
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [activeEnrollmentId, setActiveEnrollmentId] = useState(null);
  const [activeTaskRunId, setActiveTaskRunId] = useState(null);
  const [reviewData, setReviewData] = useState(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connecting to AI Bot...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Handle cross-screen navigation
  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCourse = (course, enrollmentId = null) => {
    setSelectedCourse(course);
    if (enrollmentId) setActiveEnrollmentId(enrollmentId);
  };

  const handleReviewReceived = (review, submission) => {
    setReviewData(review);
  };

  return (
    <div className="app-container">
      <Sidebar currentScreen={currentScreen} onNavigate={handleNavigate} />

      <div className="app-main">
        <Header currentScreen={currentScreen} onNavigate={handleNavigate} />

        <main className="page-content">
          {/* Admin Screen Views */}
          {isAdmin && (
            <>
              {currentScreen === 'admin-dashboard' && (
                <AdminDashboard
                  onNavigate={handleNavigate}
                  onSelectCourse={setSelectedCourse}
                />
              )}
              {currentScreen === 'course-builder' && (
                <CourseBuilder
                  selectedCourse={selectedCourse}
                  onSelectCourse={setSelectedCourse}
                  onNavigate={handleNavigate}
                  onSelectModule={setSelectedModule}
                />
              )}
              {currentScreen === 'lesson-editor' && (
                <LessonEditor
                  selectedModule={selectedModule}
                  onNavigate={handleNavigate}
                />
              )}
              {currentScreen === 'assignment-builder' && (
                <AssignmentBuilder
                  selectedModule={selectedModule}
                  onNavigate={handleNavigate}
                />
              )}
              {currentScreen === 'student-progress' && (
                <StudentProgress onNavigate={handleNavigate} />
              )}
            </>
          )}

          {/* Student Screen Views */}
          {!isAdmin && (
            <>
              {currentScreen === 'student-dashboard' && (
                <StudentDashboard
                  onNavigate={handleNavigate}
                  onSelectCourse={handleSelectCourse}
                  onSelectTask={setActiveTaskRunId}
                />
              )}
              {currentScreen === 'mentor' && (
                <MentorChat
                  activeEnrollmentId={activeEnrollmentId}
                  activeCourse={selectedCourse}
                  onNavigate={handleNavigate}
                />
              )}
              {currentScreen === 'assignment-workspace' && (
                <AssignmentWorkspace
                  taskRunId={activeTaskRunId}
                  onNavigate={handleNavigate}
                  onReviewReceived={handleReviewReceived}
                />
              )}
              {currentScreen === 'review-feedback' && (
                <ReviewFeedback
                  reviewData={reviewData}
                  onNavigate={handleNavigate}
                />
              )}
              {currentScreen === 'learning-path' && (
                <LearningPath
                  activeEnrollmentId={activeEnrollmentId}
                  onNavigate={handleNavigate}
                  onSelectTask={setActiveTaskRunId}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
