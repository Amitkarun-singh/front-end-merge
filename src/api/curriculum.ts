// src/api/curriculum.ts"
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const createApiClient = (token: string) => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

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

export const getSubjects = async (
  token: string,
  classId: number,
  board: string,
  streamId: number
) => {
  const api = createApiClient(token);

  const response = await api.get(
    `/curriculum/class/${classId}/subject`,
    {
      params: {
        board,
        streamId,
      },
    }
  );

  return response.data.data;
};

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