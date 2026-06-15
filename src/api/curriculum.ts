// src/api/curriculum.ts
import { config } from "../../app.config.js";

import axios from "axios";

const API_BASE_URL = `${config.server}/api/v1`;


/* ===========================
   TYPES
=========================== */

export interface Class {
  id: number;
  class_name: string;
  slug: string;
}

export interface Stream {
  id: number;
  stream_name: string;
  slug: string;
}

export interface Subject {
  id: number;
  subject_name: string;
  slug: string;
  board: string;
  stream_id: number;
  stream: Stream;
}

export interface Chapter {
  id: number;
  name: string;
  subject_id: number;
  language: string;
}

export interface Section {
  id: number;
  section_id: number;  // alias — may match id depending on backend response
  section_name: string;
  slug?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/* ===========================
   API CLIENT
=========================== */

export const createApiClient = (token: string) => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/* ===========================
   READ — CLASSES / STREAMS / SECTIONS
=========================== */

export const getClasses = async (token: string) => {
  const api = createApiClient(token);

  const response = await api.get("/curriculum/class");

  return response.data.data;
};

export const getStreams = async (token: string) => {
  const api = createApiClient(token);

  const response = await api.get("/curriculum/stream");

  return response.data.data;
};

export const getSections = async (token: string): Promise<Section[]> => {
  // The curriculum microservice exposes /api/v1/section directly.
  // The admin-backend proxy does not yet expose this endpoint,
  // so we call the curriculum service directly (same as admin-frontend).
  const CURRICULUM_URL = "http://localhost:3000";
  try {
    const res = await axios.get(`${CURRICULUM_URL}/api/v1/section`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/* ===========================
   READ — SUBJECTS
=========================== */

export const getSubjects = async (
  token: string,
  classId: number,
  board: string,
  streamId: number,
  lang: string = "english"
) => {
  const api = createApiClient(token);

  const response = await api.get(
    `/curriculum/class/${classId}/subject`,
    {
      params: {
        board,
        streamId,
        lang
      },
    }
  );

  return response.data.data;
};

/* ===========================
   READ — CHAPTERS
=========================== */

export const getChapters = async (
  token: string,
  classId: number,
  subjectId: number,
  board: string,
  streamId: number,
  lang: string = "english"
) => {
  const api = createApiClient(token);

  const response = await api.get(
    `/curriculum/class/${classId}/subject/${subjectId}/chapter`,
    {
      params: {
        board,
        streamId,
        lang,
      },
    }
  );

  return response.data.data;
};

/* ===========================
   WRITE — ASSIGN / REMOVE CLASS
=========================== */

export const assignClass = async (
  token: string,
  payload: {
    userId: string | number;
    schoolId: string | number;
    classId: string | number;
    streamId: string | number;
    sectionId: string | number;
  }
) => {
  const api = createApiClient(token);
  const response = await api.post("/curriculum/assign-class", payload);
  return response.data;
};

export const removeClass = async (
  token: string,
  userId: string | number
) => {
  const api = createApiClient(token);
  const response = await api.delete("/curriculum/remove-class", {
    data: { userId },
  });
  return response.data;
};

/* ===========================
   WRITE — CREATE / DELETE SUBJECT
=========================== */

export const createSubject = async (
  token: string,
  payload: {
    subjectName: string;
    board: string;
    streamId: string | number;
    classIds?: number[];
  }
) => {
  const api = createApiClient(token);
  const response = await api.post("/curriculum/subject", payload);
  return response.data;
};

export const deleteSubject = async (
  token: string,
  subjectId: string | number
) => {
  const api = createApiClient(token);
  const response = await api.delete(`/curriculum/subject/${subjectId}`);
  return response.data;
};

/* ===========================
   WRITE — CREATE / DELETE CHAPTER
=========================== */

export const createChapter = async (
  token: string,
  payload: {
    name: string;
    subjectId: string | number;
    language: string;
  }
) => {
  const api = createApiClient(token);
  const response = await api.post("/curriculum/chapter", payload);
  return response.data;
};

export const deleteChapter = async (
  token: string,
  chapterId: string | number
) => {
  const api = createApiClient(token);
  const response = await api.delete(`/curriculum/chapter/${chapterId}`);
  return response.data;
};