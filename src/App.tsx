import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { FeatureProvider } from "@/context/FeatureContext";
import { RegistrationProvider } from "@/context/RegistrationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FeatureRoute } from "@/components/FeatureRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ToastProvider } from "@/components/assessment/ToastProvider";

import StudentLoginPage from "./pages/StudentLoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import CompleteProfile from "./pages/CompleteProfile";
import HomePage from "./pages/HomePage";
import AIGiniPage from "./pages/AIGiniPage";
import AINotesPage from "./pages/AINotesPage";
import AIPracticePage from "./pages/AIPracticePage";
import AITutorPage from "./pages/AITutorPage";
import SummarizerPage from "./pages/SummarizerPage";
import PerformancePage from "./pages/PerformancePage";
import HistoryPage from "./pages/HistoryPage";
import MoreToolsPage from "./pages/MoreToolsPage";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";
import NotFound from "./pages/NotFound";
import QuestionBankPage from "./pages/QuestionBankPage";
import ConversationPage from "./pages/ConversationPage";

// ── Assessment: Teacher ──────────────────────────────────
import TeacherAssessmentsPage from "./pages/assessment/teacher/TeacherAssessmentsPage";
import CreateAssessmentPage from "./pages/assessment/teacher/CreateAssessmentPage";
import ReviewQuestionsPage from "./pages/assessment/teacher/ReviewQuestionsPage";
import AssignAssessmentPage from "./pages/assessment/teacher/AssignAssessmentPage";
import AssignmentResultsPage from "./pages/assessment/teacher/AssignmentResultsPage";
import TeacherAssessmentResultsPage from "./pages/assessment/teacher/TeacherAssessmentResultsPage";

// ── Assessment: Student ──────────────────────────────────
import StudentTestsPage from "./pages/assessment/student/StudentTestsPage";
import TakeTestPage from "./pages/assessment/student/TakeTestPage";
import TestResultPage from "./pages/assessment/student/TestResultPage";
import TestSubmittedPage from "./pages/assessment/student/TestSubmittedPage";
import { initializeNotifications } from "./firebase/notification";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <div id="recaptcha-container"></div>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/* FeatureProvider must be inside AuthProvider so it can read the token */}
          <FeatureProvider>
            <RegistrationProvider>
              <ToastProvider>
                <Routes>
                  {/* ── Public ── */}
                  <Route path="/login" element={<StudentLoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  {/* ── Registration flow ── */}
                  <Route path="/register" element={<Register />} />
                  <Route path="/register/verify" element={<VerifyOtp />} />
                  <Route path="/register/profile" element={<CompleteProfile />} />

                {/* ── Student: Take Test (full-screen, no sidebar) ── */}
                <Route
                  path="/student/tests/:assignment_id/attempt"
                  element={
                    <ProtectedRoute>
                      {/* Full-screen: redirect silently since there's no sidebar/layout */}
                      <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/student/tests">
                        <TakeTestPage />
                      </FeatureRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/tests/submitted"
                  element={
                    <ProtectedRoute>
                      <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/student/tests">
                        <TestSubmittedPage />
                      </FeatureRoute>
                    </ProtectedRoute>
                  }
                />

                {/* ── Protected (with sidebar) ── */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Routes>
                          {/* ── Always-accessible pages ── */}
                          <Route path="/" element={<HomePage />} />
                          <Route path="/profile" element={<ProfilePage />} />
                          <Route path="/performance" element={<PerformancePage />} />
                          <Route path="/history" element={<HistoryPage />} />
                          <Route path="/history/conversation/:conversation_id" element={<ConversationPage />} />
                          <Route path="/support" element={<SupportPage />} />
                          <Route path="/feedback" element={<SupportPage />} />
                          <Route path="/new-course" element={<HomePage />} />

                          {/* ── Feature-gated pages ── */}
                          <Route
                            path="/ai-gini"
                            element={
                              <FeatureRoute feature="AI_GINI">
                                <AIGiniPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/ai-notes"
                            element={
                              <FeatureRoute feature="AI_NOTES">
                                <AINotesPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/ai-flashcards"
                            element={
                              <FeatureRoute feature="AI_NOTES">
                                <AINotesPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/ai-tutor"
                            element={
                              <FeatureRoute feature="AI_TUTOR">
                                <AITutorPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/ai-practice"
                            element={
                              <FeatureRoute feature="AI_PRACTICE">
                                <AIPracticePage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/summarizer"
                            element={
                              <FeatureRoute feature="DOC_SUMMARISER">
                                <SummarizerPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/question-bank"
                            element={
                              <FeatureRoute feature="QUESTION_BANK">
                                <QuestionBankPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/more-tools"
                            element={
                              <FeatureRoute feature="MORE_TOOLS">
                                <MoreToolsPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/tools/*"
                            element={
                              <FeatureRoute feature="MORE_TOOLS">
                                <MoreToolsPage />
                              </FeatureRoute>
                            }
                          />

                          {/* ── Teacher Assessment (gated by AI_ASSESSMENT) ── */}
                          <Route
                            path="/teacher/assessments"
                            element={
                              <FeatureRoute
                                feature="AI_ASSESSMENT"
                                showDisabledMessage
                                disabledTitle="AI Assessment"
                              >
                                <TeacherAssessmentsPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/teacher/assessments/create"
                            element={
                              <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/teacher/assessments">
                                <CreateAssessmentPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/teacher/assessments/:id/review"
                            element={
                              <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/teacher/assessments">
                                <ReviewQuestionsPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/teacher/assessments/:id/assign"
                            element={
                              <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/teacher/assessments">
                                <AssignAssessmentPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/teacher/assessments/assignment/:id/results"
                            element={
                              <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/teacher/assessments">
                                <AssignmentResultsPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/teacher/assessments/:id/results"
                            element={
                              <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/teacher/assessments">
                                <TeacherAssessmentResultsPage />
                              </FeatureRoute>
                            }
                          />

                          {/* ── Student Assessment / My Tests (gated by AI_ASSESSMENT) ── */}
                          <Route
                            path="/student/tests"
                            element={
                              <FeatureRoute
                                feature="AI_ASSESSMENT"
                                showDisabledMessage
                                disabledTitle="My Tests"
                              >
                                <StudentTestsPage />
                              </FeatureRoute>
                            }
                          />
                          <Route
                            path="/student/tests/result/:attempt_id"
                            element={
                              <FeatureRoute feature="AI_ASSESSMENT" redirectTo="/student/tests">
                                <TestResultPage />
                              </FeatureRoute>
                            }
                          />

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </ToastProvider>
          </RegistrationProvider>
        </FeatureProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
