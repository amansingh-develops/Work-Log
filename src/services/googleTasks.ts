import { getGoogleAccessToken } from "../lib/firebase";

export interface CreateGoogleTaskParams {
  title: string;
  notes?: string;
  dueDate?: string; // YYYY-MM-DD
}

export interface GoogleTaskResult {
  id: string;
  title: string;
  status: string;
  updated?: string;
  selfLink?: string;
}

export async function createGoogleTask(
  params: CreateGoogleTaskParams
): Promise<GoogleTaskResult> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error(
      "Google Tasks authorization is required. Please sign in or reconnect your Google Account with Google Tasks permissions."
    );
  }

  const payload: { title: string; notes?: string; due?: string } = {
    title: params.title,
  };

  if (params.notes) {
    payload.notes = params.notes;
  }

  if (params.dueDate) {
    // Format to RFC 3339 UTC timestamp
    const dateObj = new Date(`${params.dueDate}T09:00:00Z`);
    payload.due = dateObj.toISOString();
  }

  const response = await fetch(
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error?.message ||
      `Google Tasks API error (Status ${response.status}). Token may have expired.`;
    throw new Error(message);
  }

  const data = await response.json();
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    updated: data.updated,
    selfLink: data.selfLink,
  };
}
