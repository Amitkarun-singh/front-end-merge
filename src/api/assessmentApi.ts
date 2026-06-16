import axios from "axios";
import { config } from "../../app.config.js";

// ─── Axios Instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: config.server,
});

api.interceptors.request.use((cfg) => {
  // Auth context stores token inside the JSON object under "schools2ai_auth"
  // Fallback to a plain "accessToken" key for flexibility
  let token: string | null = null;
  try {
    const stored = localStorage.getItem("schools2ai_auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.token ?? null;
    }
  } catch {
    // ignore
  }
  if (!token) token = localStorage.getItem("accessToken");

  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Assessment {
  id: number;
  title: string;
  subject_name: string;
  class_name: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published" | "archived";
  total_questions: number;
  pending_questions: number;
  approved_questions: number;
  total_marks: number;
  time_limit: number | null;
  assigned_count: number;
}

export interface Question {
  id: number;
  assessment_id: number;
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer" | "essay";
  options?: { A: string; B: string; C: string; D: string };
  correct_answer?: string;
  hint?: string;
  marks: number;
  status: "pending" | "approved";
}

export interface AssignedTest {
  assignment_id: number;
  assessment_id: number;
  title: string;
  subject_name: string;
  total_marks: number;
  time_limit: number | null;
  start_datetime: string;
  end_datetime: string;
  status: "not_started" | "in_progress" | "submitted";
  show_result_immediately: boolean;
  attempt_id?: number;
}

export interface AttemptResult {
  attempt_id: number;
  score: number;
  total_marks: number;
  percentage: number;
  time_taken_seconds: number;
  answers: {
    question_id: number;
    question_text: string;
    question_type: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }[];
}

export interface AssignmentResult {
  assignment_id: number;
  total_attempted: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  total_marks: number;
  attempts: {
    student_name: string;
    roll_number: string;
    score: number;
    total_marks: number;
    percentage: number;
    submitted_at: string;
    status: string;
  }[];
}

// ─── Teacher APIs ──────────────────────────────────────────────────────────────

export const teacherApi = {
  // GET /api/v1/assessments/teacher/my
  getMyAssessments: (params?: Record<string, string | number>) =>
    api.get("/api/v1/assessments/teacher/my", { params }),

  createAssessment: (data: Record<string, unknown>) =>
    api.post("/api/v1/assessments", data),

  // GET /api/v1/assessments/:assessment_id  (returns { assessment, questions })
  getAssessmentQuestions: (id: number) =>
    api.get(`/api/v1/assessments/${id}`),

  patchQuestion: (questionId: number, data: Record<string, unknown>) =>
    api.patch(`/api/v1/assessments/questions/${questionId}`, data),

  approveAllQuestions: (assessmentId: number) =>
    api.patch(`/api/v1/assessments/${assessmentId}/questions/approve-all`),

  addQuestion: (assessmentId: number, data: Record<string, unknown>) =>
    api.post(`/api/v1/assessments/${assessmentId}/questions`, data),

  publishAssessment: (id: number) =>
    api.patch(`/api/v1/assessments/${id}/publish`),

  assignAssessment: (id: number, data: Record<string, unknown>) =>
    api.post(`/api/v1/assessments/${id}/assign`, data),

  getAssignmentResults: (assignmentId: number) =>
    api.get(`/api/v1/assessments/assignment/${assignmentId}/results`),

  // DELETE /api/v1/assessments/:id (archive/soft-delete)
  deleteAssessment: (id: number) =>
    api.delete(`/api/v1/assessments/${id}`),

  // GET /api/v1/assessments/:id/all-results — all student results for an assessment
  getAssessmentResults: (assessmentId: number) =>
    api.get(`/api/v1/assessments/${assessmentId}/all-results`),
};

// ─── Student APIs ──────────────────────────────────────────────────────────────

export const studentApi = {
  getAssignedTests: () => api.get("/api/v1/assessments/student/assigned"),

  startAttempt: (assignment_id: number) =>
    api.post("/api/v1/assessments/attempt/start", { assignment_id }),

  submitAttempt: (data: {
    attempt_id: number;
    answers: { question_id: number; answer_text: string }[];
    is_auto_submit: boolean;
  }) => api.post("/api/v1/assessments/attempt/submit", data),

  getAttemptResult: (attempt_id: number) =>
    api.get(`/api/v1/assessments/attempt/${attempt_id}/result`),

  getAttemptQuestions: (attempt_id: number) =>
    api.get(`/api/v1/assessments/attempt/${attempt_id}/questions`),
};

// ─── Shared APIs ───────────────────────────────────────────────────────────────

export const sharedApi = {
  // GET /api/v1/curriculum/section — all sections via curriculum proxy
  getSections: () =>
    api.get("/api/v1/curriculum/section"),

  // GET /api/v1/curriculum/class — classes via curriculum proxy
  getClasses: () =>
    api.get("/api/v1/curriculum/class"),

  // GET /api/v1/curriculum/stream — streams via curriculum proxy
  getStreams: () =>
    api.get("/api/v1/curriculum/stream"),

  // GET /api/v1/curriculum/class/:classId/subject?board=&streamId=&lang=
  getSubjectsByClass: (class_id: number | string, board = "CBSE", streamId: number | string = 4, lang = "english") =>
    api.get(`/api/v1/curriculum/class/${class_id}/subject`, { params: { board, streamId, lang } }),

  getSubjects: () =>
    api.get("/api/v1/curriculum/class"),

  // GET /api/v1/curriculum/class/:classId/subject/:subjectId/chapter?board=&streamId=&lang=
  getChaptersBySubject: (class_id: number | string, subject_id: number | string, board = "CBSE", streamId: number | string = 4, lang = "english") =>
    api.get(`/api/v1/curriculum/class/${class_id}/subject/${subject_id}/chapter`, { params: { board, streamId, lang } }),
};
