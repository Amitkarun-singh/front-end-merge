import { config } from "../../app.config.js";

const BASE_URL = `${config.server}/gini/ai`;

/**
 * Submits thumbs up feedback to the API with the user message and AI response.
 */
export async function submitThumbsUp(
  userMessage: string,
  response: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/feedback/thumbs-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userMessage, response }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to submit thumbs up");
  }
}

/**
 * Submits thumbs down feedback to the API with the user message, AI response, and feedback text.
 */
export async function submitFeedback(
  userMessage: string,
  response: string,
  feedback: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userMessage, response, feedback }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to submit feedback");
  }
}
