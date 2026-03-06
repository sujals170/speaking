const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || "Something went wrong";
    throw new Error(message);
  }

  return data;
};

export const registerUser = (payload) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const loginUser = (payload) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const evaluateSpeaking = (token, payload) =>
  request("/api/ai/speaking", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });

export const evaluateSpeakingAudio = async (token, payload) => {
  const formData = new FormData();
  formData.append("audio", payload.audio);
  if (payload.question) {
    formData.append("question", payload.question);
  }

  const response = await fetch(`${API_URL}/api/ai/speaking-audio`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || "Something went wrong";
    throw new Error(message);
  }

  return data;
};
