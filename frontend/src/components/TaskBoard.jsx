import { useMemo } from "react";
import SpeakingCoach from "./SpeakingCoach.jsx";

const motivationLines = [
  "One answer at a time. You have this.",
  "Progress beats perfection. Keep speaking.",
  "Practice today, confidence tomorrow.",
  "Clarity grows with every attempt.",
  "Small improvements add up quickly.",
  "Speak slowly. Think clearly.",
  "Keep the momentum alive.",
  "Your fluency is built in minutes, not miracles.",
  "Be curious about your mistakes.",
  "One focused session can change your day.",
  "Start now. Refine later.",
  "You're capable, you're ready.",
  "Do it with calm confidence.",
  "Your voice gets stronger with practice.",
  "Consistency makes IELTS feel easier."
];

const getDailyMotivation = () => {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayIndex = Math.floor(midnight / 86400000) % motivationLines.length;
  return motivationLines[dayIndex];
};

const TaskBoard = ({ token, user, onLogout }) => {
  const dailyMotivation = useMemo(() => getDailyMotivation(), []);

  return (
    <div className="dashboard">
      <header className="top-bar">
        <div>
          <h1>Welcome back, {user?.name || "Friend"}.</h1>
          <p>Warm up, answer a prompt, and get instant IELTS-style feedback.</p>
          <p className="motivation">{dailyMotivation}</p>
        </div>
        <button className="ghost" onClick={onLogout}>Log out</button>
      </header>

      <section className="speaking-section">
        <SpeakingCoach token={token} />
      </section>
    </div>
  );
};

export default TaskBoard;
