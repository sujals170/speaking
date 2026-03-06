import { useEffect, useRef, useState } from "react";
import { evaluateSpeaking, evaluateSpeakingAudio } from "../api.js";

const SpeakingCoach = ({ token }) => {
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [language, setLanguage] = useState("en-US");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const listeningRef = useRef(false);
  const ignoreEndRef = useRef(false);
  const sessionPrefixRef = useRef("");

  const languages = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "en-IN", label: "English (India)" },
    { value: "en-AU", label: "English (Australia)" }
  ];

  const normalizeTranscript = (value) => value.replace(/\s+/g, " ").trim();

  const buildTranscript = (results) => {
    const finals = [];
    const interims = [];

    for (let i = 0; i < results.length; i += 1) {
      const result = results[i];
      const text = result[0]?.transcript?.trim();
      if (!text) continue;
      if (result.isFinal) {
        finals.push(text);
      } else {
        interims.push(text);
      }
    }

    return {
      finalText: finals.join(" "),
      interimText: interims.join(" ")
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const { finalText, interimText } = buildTranscript(event.results);
      const mergedFinal = normalizeTranscript(`${sessionPrefixRef.current} ${finalText}`);
      finalTranscriptRef.current = mergedFinal;
      setTranscript(normalizeTranscript(`${mergedFinal} ${interimText}`));
    };

    recognition.onend = () => {
      if (ignoreEndRef.current) {
        ignoreEndRef.current = false;
        return;
      }

      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
          listeningRef.current = false;
        }
      } else {
        setListening(false);
      }
    };

    recognition.onerror = (event) => {
      if (event?.error === "no-speech" || event?.error === "aborted") {
        return;
      }
      setListening(false);
      listeningRef.current = false;
      setError("Speech recognition failed. You can type the transcript instead.");
    };

    recognitionRef.current = recognition;
  }, []);

  const handleStart = () => {
    if (!recognitionRef.current) return;
    if (listeningRef.current) return;
    setError("");
    setResult(null);
    recognitionRef.current.lang = language;
    sessionPrefixRef.current = normalizeTranscript(finalTranscriptRef.current);
    setListening(true);
    listeningRef.current = true;
    try {
      recognitionRef.current.start();
    } catch {
      setListening(false);
      listeningRef.current = false;
    }
  };

  const handleStop = () => {
    if (!recognitionRef.current) return;
    ignoreEndRef.current = true;
    recognitionRef.current.stop();
    setListening(false);
    listeningRef.current = false;
  };

  const handleClear = () => {
    finalTranscriptRef.current = "";
    setQuestion("");
    setTranscript("");
    setAudioFile(null);
    setResult(null);
    setError("");
  };

  const handleEvaluate = async () => {
    if (!token) return;
    if (!audioFile && !transcript.trim()) {
      setError("Please provide an answer or an audio file first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let data;
      if (audioFile) {
        data = await evaluateSpeakingAudio(token, { audio: audioFile, question });
        if (data.transcript && !transcript.trim()) {
          finalTranscriptRef.current = data.transcript;
          setTranscript(data.transcript);
        }
      } else {
        data = await evaluateSpeaking(token, { transcript, question });
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscriptChange = (event) => {
    const value = event.target.value;
    finalTranscriptRef.current = value;
    setTranscript(value);
  };

  const handleAudioChange = (event) => {
    const file = event.target.files?.[0] || null;
    setAudioFile(file);
    if (file) {
      finalTranscriptRef.current = "";
      setTranscript("");
    }
  };

  return (
    <div className="speaking-card">
      <div className="speaking-header">
        <div>
          <h2>English Speaking Coach</h2>
          <p>Add a question, record or paste your answer, and get an IELTS band and mistakes.</p>
        </div>
        <div className="speaking-actions">
          <button type="button" className="ghost" onClick={handleClear}>
            Clear
          </button>
          <button
            type="button"
            className="ghost"
            onClick={listening ? handleStop : handleStart}
            disabled={!supported}
          >
            {listening ? "Stop" : "Start mic"}
          </button>
        </div>
      </div>

      {!supported && (
        <div className="error banner">
          Your browser does not support speech recognition. You can still paste text below.
        </div>
      )}

      <label>
        Accent
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          {languages.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Question
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g., Describe a challenge you overcame."
        />
      </label>

      <label>
        Audio File (optional)
        <input type="file" accept="audio/*" onChange={handleAudioChange} />
      </label>

      {audioFile && (
        <div className="audio-meta">
          <span>Selected: {audioFile.name}</span>
          <button type="button" className="ghost" onClick={() => setAudioFile(null)}>
            Remove
          </button>
        </div>
      )}

      <label>
        Answer
        <textarea
          rows="8"
          value={transcript}
          onChange={handleTranscriptChange}
          placeholder="Paste or speak your response here..."
        />
      </label>

      {error && <div className="error">{error}</div>}

      <button type="button" onClick={handleEvaluate} disabled={loading}>
        {loading ? "Analyzing..." : "Check speaking"}
      </button>

      {result && (
        <div className="speaking-result">
          <div className="speaking-score">
            <span>IELTS Band</span>
            <strong>{result.band}</strong>
          </div>
          <p className="speaking-summary">{result.summary}</p>
          {result.grammarFeedback && (
            <div className="speaking-grammar">
              <div className="section-title">Grammar feedback</div>
              <p>{result.grammarFeedback}</p>
            </div>
          )}
          {result.mistakes?.length > 0 && (
            <div className="speaking-list">
              <div className="section-title">Mistakes</div>
              {result.mistakes.map((item, index) => (
                <div key={`${item.issue}-${index}`} className="mistake">
                  <strong>{item.issue}</strong>
                  <span>{item.fix}</span>
                </div>
              ))}
            </div>
          )}
          {result.tips?.length > 0 && (
            <div className="speaking-list">
              <div className="section-title">Tips</div>
              {result.tips.map((tip, index) => (
                <div key={`${tip}-${index}`} className="tip">
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpeakingCoach;
