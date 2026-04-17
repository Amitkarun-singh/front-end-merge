import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ToastProvider } from "@/components/assessment/ToastProvider";

import StudentLoginPage from "./pages/StudentLoginPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* ── Public ── */}
              <Route path="/login" element={<StudentLoginPage />} />

              {/* ── Student: Take Test (full-screen, no sidebar) ── */}
              <Route
                path="/student/tests/:assignment_id/attempt"
                element={
                  <ProtectedRoute>
                    <TakeTestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/tests/submitted"
                element={
                  <ProtectedRoute>
                    <TestSubmittedPage />
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
                        {/* Existing pages */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/ai-gini" element={<AIGiniPage />} />
                        <Route path="/ai-notes" element={<AINotesPage />} />
                        <Route path="/ai-practice" element={<AIPracticePage />} />
                        <Route path="/ai-tutor" element={<AITutorPage />} />
                        <Route path="/ai-flashcards" element={<AINotesPage />} />
                        <Route path="/summarizer" element={<SummarizerPage />} />
                        <Route path="/performance" element={<PerformancePage />} />
                        <Route path="/more-tools" element={<MoreToolsPage />} />
                        <Route path="/question-bank" element={<QuestionBankPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/new-course" element={<HomePage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/history/conversation/:conversation_id" element={<ConversationPage />} />
                        <Route path="/tools/*" element={<MoreToolsPage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/feedback" element={<SupportPage />} />

                        {/* ── Teacher Assessment ── */}
                        <Route path="/teacher/assessments" element={<TeacherAssessmentsPage />} />
                        <Route path="/teacher/assessments/create" element={<CreateAssessmentPage />} />
                        <Route path="/teacher/assessments/:id/review" element={<ReviewQuestionsPage />} />
                        <Route path="/teacher/assessments/:id/assign" element={<AssignAssessmentPage />} />
                        <Route path="/teacher/assessments/assignment/:id/results" element={<AssignmentResultsPage />} />
                        <Route path="/teacher/assessments/:id/results" element={<TeacherAssessmentResultsPage />} />

                        {/* ── Student Assessment ── */}
                        <Route path="/student/tests" element={<StudentTestsPage />} />
                        <Route path="/student/tests/result/:attempt_id" element={<TestResultPage />} />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
