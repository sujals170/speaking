import express from "express";
import multer from "multer";

import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const estimateWithHeuristic = ({ title = "", description = "", priority = "medium" }) => {
  const text = `${title} ${description}`.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const base = Math.max(15, Math.min(120, 10 + wordCount * 2));
  const multiplier = priority === "high" ? 1.3 : priority === "low" ? 0.85 : 1;
  return Math.round(base * multiplier);
};

const speakingFallback = (transcript = "") => {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  let band = 5;

  if (wordCount < 30) {
    band = 4;
  } else if (wordCount < 80) {
    band = 5;
  } else if (wordCount < 150) {
    band = 6;
  } else {
    band = 7;
  }

  return {
    band,
    summary: "Fallback estimate (AI unavailable).",
    grammarFeedback: "Focus on complete sentences and subject-verb agreement.",
    mistakes: [
      {
        issue: "Provide a longer sample for a more accurate score.",
        fix: "Speak for 45-60 seconds and try to use full sentences."
      }
    ],
    tips: [
      "Use linking words like because, however, and for example.",
      "Vary sentence length to improve fluency."
    ]
  };
};

const getGeminiContent = async (parts) => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini response missing text");
  }

  return text;
};

const getGeminiText = async (prompt) => {
  return getGeminiContent([{ text: prompt }]);
};

const parseJsonFromText = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
};

router.post("/estimate", async (req, res) => {
  const payload = req.body || {};

  const prompt = `Estimate completion time in minutes for the task. Return ONLY JSON: {"estimatedMinutes": number, "rationale": "short"}.
Task title: ${payload.title || ""}
Description: ${payload.description || ""}
Priority: ${payload.priority || "medium"}
Tags: ${(payload.tags || []).join(", ")}
Recurrence: ${payload.recurrence?.frequency || "none"} every ${payload.recurrence?.interval || 1}`;

  try {
    const raw = await getGeminiText(prompt);
    const parsed = parseJsonFromText(raw);
    const estimatedMinutes = Number(parsed?.estimatedMinutes);

    if (!estimatedMinutes || Number.isNaN(estimatedMinutes)) {
      throw new Error("Gemini response missing estimate");
    }

    return res.json({
      estimatedMinutes,
      rationale: parsed?.rationale || "Gemini estimated time based on task details."
    });
  } catch (error) {
    const estimatedMinutes = estimateWithHeuristic(payload);
    return res.json({
      estimatedMinutes,
      rationale: "Fallback estimate (Gemini unavailable)."
    });
  }
});

router.post("/speaking", async (req, res) => {
  const payload = req.body || {};
  const question = String(payload.question || "").trim();
  const transcript = String(payload.transcript || "").trim();

  if (!transcript) {
    return res.status(400).json({ message: "Transcript is required" });
  }

  const prompt = `You are an English speaking examiner. Evaluate the answer and return ONLY JSON:\n{\n  \"band\": number,\n  \"summary\": \"short feedback\",\n  \"grammarFeedback\": \"short grammar assessment\",\n  \"mistakes\": [{\"issue\": \"...\", \"fix\": \"...\"}],\n  \"tips\": [\"...\"]\n}\nGive an IELTS band between 1 and 9 based on grammar, vocabulary, coherence, and fluency. Keep the summary short.\nQuestion: ${question || "N/A"}\nAnswer: ${transcript}`;

  try {
    const raw = await getGeminiText(prompt);
    const parsed = parseJsonFromText(raw);
    const band = Number(parsed?.band);

    if (!band || Number.isNaN(band)) {
      throw new Error("Gemini response missing band");
    }

    return res.json({
      band,
      summary: parsed?.summary || "Gemini assessment based on transcript.",
      grammarFeedback: parsed?.grammarFeedback || "Grammar feedback unavailable.",
      mistakes: Array.isArray(parsed?.mistakes) ? parsed.mistakes : [],
      tips: Array.isArray(parsed?.tips) ? parsed.tips : []
    });
  } catch (error) {
    const fallback = speakingFallback(transcript);
    return res.json(fallback);
  }
});

router.post("/speaking-audio", upload.single("audio"), async (req, res) => {
  const question = String(req.body?.question || "").trim();

  if (!req.file) {
    return res.status(400).json({ message: "Audio file is required" });
  }

  const mimeType = req.file.mimetype || "audio/mpeg";
  const base64Audio = req.file.buffer.toString("base64");

  const prompt = `You are an English speaking examiner. First transcribe the audio, then evaluate the answer. Return ONLY JSON:\n{\n  \"transcript\": \"...\",\n  \"band\": number,\n  \"summary\": \"short feedback\",\n  \"grammarFeedback\": \"short grammar assessment\",\n  \"mistakes\": [{\"issue\": \"...\", \"fix\": \"...\"}],\n  \"tips\": [\"...\"]\n}\nGive an IELTS band between 1 and 9 based on grammar, vocabulary, coherence, and fluency. Keep the summary short.\nQuestion: ${question || "N/A"}`;

  let parsedTranscript = "";

  try {
    const raw = await getGeminiContent([
      { text: prompt },
      { inlineData: { mimeType, data: base64Audio } }
    ]);
    const parsed = parseJsonFromText(raw);
    parsedTranscript = String(parsed?.transcript || "");
    const band = Number(parsed?.band);

    if (!band || Number.isNaN(band)) {
      throw new Error("Gemini response missing band");
    }

    return res.json({
      transcript: parsedTranscript,
      band,
      summary: parsed?.summary || "Gemini assessment based on transcript.",
      grammarFeedback: parsed?.grammarFeedback || "Grammar feedback unavailable.",
      mistakes: Array.isArray(parsed?.mistakes) ? parsed.mistakes : [],
      tips: Array.isArray(parsed?.tips) ? parsed.tips : []
    });
  } catch (error) {
    const fallback = speakingFallback(parsedTranscript);
    return res.json({ ...fallback, transcript: parsedTranscript });
  }
});

export default router;
