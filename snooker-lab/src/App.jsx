import { useState, useEffect, useCallback } from "react";

const BALLS = [
  { name: "Red", points: 1, color: "#CC1100", hi: "#ff4433", lo: "#880800" },
  { name: "Yellow", points: 2, color: "#D4A017", hi: "#ffe44a", lo: "#9a7200" },
  { name: "Green", points: 3, color: "#1B8C1B", hi: "#3dbf3d", lo: "#0d5c0d" },
  { name: "Brown", points: 4, color: "#7B3F00", hi: "#a86828", lo: "#4a2600" },
  { name: "Blue", points: 5, color: "#1a53c0", hi: "#4a8af5", lo: "#0e2d6a" },
  { name: "Pink", points: 6, color: "#D1598A", hi: "#f08ab8", lo: "#992860" },
  { name: "Black", points: 7, color: "#222", hi: "#555", lo: "#000" },
];

const EXERCISES = [
  { id: "lineup", name: "Line-up", description: "15 reds + colors in sequence" },
  { id: "the_t", name: "The T", description: "T-shaped positional drill" },
  { id: "straight_blue", name: "Straight Blue", description: "Blue spot potting practice" },
];

const formatDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (ms) => {
  if (!ms) return "0м";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}ч ${mins % 60}м`;
  return `${mins}м`;
};

const STORAGE_KEY = "snooker_data";
const loadData = () => { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return { sessions: [] }; };
const saveData = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} };

// ─── Shared Skeuomorphic Styles ───

const S = {
  page: {
    minHeight: "100vh",
    background: `
      repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px),
      linear-gradient(180deg, #c5c0b6 0%, #d6d1c4 100%)
    `,
    fontFamily: "'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif",
    color: "#1a1a1a",
    WebkitFontSmoothing: "antialiased",
  },
  navbar: {
    background: "linear-gradient(180deg, #b8d8b8 0%, #5c8a3c 3%, #4a7a2e 50%, #3d6d22 51%, #4a7a2e 100%)",
    padding: "10px 14px 12px",
    borderBottom: "1px solid #2d5516",
    boxShadow: "0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
    color: "#fff",
    textShadow: "0 -1px 1px rgba(0,0,0,0.5)",
  },
  card: {
    background: "linear-gradient(180deg, #fff 0%, #f0efe8 100%)",
    borderRadius: 10,
    border: "1px solid #b8b5a8",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
    marginBottom: 10,
  },
  cardInner: {
    padding: "12px 14px",
  },
  insetBox: {
    background: "linear-gradient(180deg, #e8e5d8, #f2f0e6)",
    borderRadius: 8,
    border: "1px solid #c8c4b4",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.3)",
    padding: "8px 10px",
  },
  feltBg: {
    background: `
      radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 60%),
      repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px),
      linear-gradient(180deg, #1a5c2a 0%, #144d22 50%, #0e3d18 100%)
    `,
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#8a8575",
    marginBottom: 2,
  },
  bigNum: {
    fontSize: 26,
    fontWeight: 800,
    color: "#2c2c2c",
    lineHeight: 1.1,
  },
};

const GlossyBtn = ({ children, onClick, color = "green", disabled, style = {} }) => {
  const palettes = {
    green: { top: "#6db33f", mid: "#5a9a2f", bot: "#4a8522", border: "#3a6a18", text: "#fff" },
    red: { top: "#d94444", mid: "#c03030", bot: "#a82222", border: "#8a1a1a", text: "#fff" },
    gray: { top: "#8e8e93", mid: "#7a7a80", bot: "#636368", border: "#4a4a4f", text: "#fff" },
    silver: { top: "#fafafa", mid: "#e8e8e8", bot: "#d0d0d0", border: "#aaa", text: "#333" },
  };
  const p = palettes[color] || palettes.green;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `linear-gradient(180deg, ${p.top} 0%, ${p.mid} 48%, ${p.bot} 52%, ${p.mid} 100%)`,
      border: `1px solid ${p.border}`,
      borderRadius: 8,
      color: p.text,
      fontWeight: 700,
      fontSize: 14,
      padding: "12px 16px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      textShadow: color === "silver" ? "0 1px 0 rgba(255,255,255,0.8)" : "0 -1px 1px rgba(0,0,0,0.4)",
      boxShadow: `0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)`,
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      transition: "all 0.1s",
      ...style,
    }}>{children}</button>
  );
};

const NavBar = ({ title, subtitle, onBack, right }) => (
  <div style={S.navbar}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))",
            border: "1px solid rgba(0,0,0,0.25)",
            borderRadius: 6, padding: "4px 10px", color: "#fff",
            fontSize: 14, cursor: "pointer", textShadow: "0 -1px 1px rgba(0,0,0,0.4)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
          }}>‹ Назад</button>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, opacity: 0.8 }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  </div>
);

const StatBox = ({ label, value, accent }) => (
  <div style={{
    ...S.insetBox,
    textAlign: "center",
    flex: 1,
    ...(accent ? {
      background: "linear-gradient(180deg, #1a5c2a, #0e3d18)",
      border: "1px solid #0a2e10",
      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.1)",
    } : {}),
  }}>
    <div style={{ ...S.label, color: accent ? "#8bc48b" : S.label.color }}>{label}</div>
    <div style={{ ...S.bigNum, fontSize: accent ? 30 : 22, color: accent ? "#fff" : S.bigNum.color }}>
      {value}
    </div>
  </div>
);

const MiniDot = ({ ball, size = 20 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: `radial-gradient(circle at 35% 30%, ${ball.hi || ball.color}, ${ball.lo || ball.color})`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.5, fontWeight: 800,
    color: ball.name === "Yellow" ? "#1a1a1a" : "#fff",
    textShadow: ball.name === "Yellow" ? "none" : "0 -1px 0 rgba(0,0,0,0.5)",
    boxShadow: `0 1px 3px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3)`,
    border: ball.name === "Black" ? "1px solid #444" : "1px solid rgba(255,255,255,0.15)",
    flexShrink: 0,
  }}>{ball.points}</div>
);

// ─── Stats ───

const calcStats = (sessions) => {
  const completed = sessions.filter(s => s.completed);
  if (!completed.length) return null;
  const allAttempts = completed.flatMap(s => s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0)));
  const allBreaks = allAttempts.map(a => a.score);
  const best = Math.max(0, ...allBreaks);
  const avg = allBreaks.length ? allBreaks.reduce((a, b) => a + b, 0) / allBreaks.length : 0;
  const totalTime = completed.reduce((s, c) => s + (c.duration || 0), 0);
  const last10 = completed.slice(-10);
  const l10b = last10.flatMap(s => s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0))).map(a => a.score);
  const avgLast10 = l10b.length ? l10b.reduce((a, b) => a + b, 0) / l10b.length : 0;
  const totalBalls = allAttempts.reduce((s, a) => s + a.balls.length, 0);
  const totalMisses = allAttempts.filter(a => a.endReason === "miss").length;
  const potRate = totalBalls / (totalBalls + totalMisses) * 100 || 0;
  const conv20 = allBreaks.length ? allBreaks.filter(b => b >= 20).length / allBreaks.length * 100 : 0;
  const conv30 = allBreaks.length ? allBreaks.filter(b => b >= 30).length / allBreaks.length * 100 : 0;
  const consistency = best > 0 ? avg / best * 100 : 0;
  let redFollowed = 0, colorAfterRed = 0;
  allAttempts.forEach(a => { for (let i = 0; i < a.balls.length - 1; i++) { if (a.balls[i].name === "Red") { redFollowed++; if (a.balls[i + 1].name !== "Red") colorAfterRed++; } } });
  const redColorConv = redFollowed > 0 ? colorAfterRed / redFollowed * 100 : 0;
  return { totalSessions: completed.length, totalTime, bestBreak: best, avgBreak: avg, avgLast10, potRate, conv20, conv30, consistency, redColorConv, totalAttempts: allAttempts.length };
};

const calcExerciseStats = (sessions, eid) => {
  const att = sessions.filter(s => s.completed).flatMap(s => s.exercises.filter(e => e.id === eid).flatMap(e => e.attempts.filter(a => a.balls.length > 0)));
  if (!att.length) return null;
  const b = att.map(a => a.score);
  return { total: att.length, avg: b.reduce((a, c) => a + c, 0) / b.length, best: Math.max(...b) };
};

// ─── Ball Button ───

function BallButton({ ball, onPress, disabled }) {
  return (
    <button
      onClick={() => onPress(ball)}
      disabled={disabled}
      style={{
        width: 68, height: 68, borderRadius: "50%",
        background: `radial-gradient(circle at 38% 30%, ${ball.hi}, ${ball.color} 50%, ${ball.lo})`,
        border: `2px solid ${ball.lo}`,
        color: ball.name === "Yellow" ? "#2a2000" : "#fff",
        fontSize: 12, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 0,
        boxShadow: disabled ? "none" : `
          0 4px 8px rgba(0,0,0,0.5),
          0 1px 2px rgba(0,0,0,0.3),
          inset 0 2px 4px rgba(255,255,255,0.35),
          inset 0 -2px 4px rgba(0,0,0,0.2)
        `,
        textShadow: ball.name === "Yellow" ? "none" : "0 -1px 1px rgba(0,0,0,0.6)",
        transition: "transform 0.08s, box-shadow 0.08s",
        fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.92)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, fontWeight: 800 }}>{ball.points}</span>
      <span style={{ fontSize: 8, opacity: 0.9, textTransform: "uppercase", letterSpacing: 0.8 }}>{ball.name}</span>
    </button>
  );
}

// ─── Exercise Screen ───

function ExerciseScreen({ exercise, session, onBack, onUpdateSession }) {
  const currentExercise = session.exercises.find(e => e.id === exercise.id);
  const [currentAttemptBalls, setCurrentAttemptBalls] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentBreak, setCurrentBreak] = useState(0);
  const [history, setHistory] = useState([]);

  const allAttempts = currentExercise?.attempts || [];
  const completedAttempts = allAttempts.filter(a => a.balls.length > 0 || a.score > 0);
  const bestBreakExercise = Math.max(0, ...completedAttempts.map(a => a.maxBreak || a.score), currentBreak);
  const totalScoreExercise = completedAttempts.reduce((s, a) => s + a.score, 0) + currentScore;
  const avgBreak = completedAttempts.length ? completedAttempts.reduce((s, a) => s + a.score, 0) / completedAttempts.length : 0;

  const lastBall = currentAttemptBalls.length > 0 ? currentAttemptBalls[currentAttemptBalls.length - 1] : null;
  const isStart = currentAttemptBalls.length === 0;
  const expectColor = lastBall?.name === "Red";
  const expectRed = lastBall && lastBall.name !== "Red";
  const startWithRed = isStart && exercise.id !== "straight_blue";

  const isBallDisabled = (ball) => {
    if (startWithRed && ball.name !== "Red") return true;
    if (expectColor && ball.name === "Red") return true;
    if (expectRed && ball.name !== "Red") return true;
    return false;
  };

  const addBall = useCallback((ball) => {
    setHistory(h => [...h, { balls: [...currentAttemptBalls], score: currentScore, brk: currentBreak }]);
    setCurrentAttemptBalls(b => [...b, ball]);
    setCurrentScore(s => s + ball.points);
    setCurrentBreak(b => b + ball.points);
  }, [currentAttemptBalls, currentScore, currentBreak]);

  const endAttempt = useCallback((reason) => {
    const attempt = { number: allAttempts.length + 1, balls: currentAttemptBalls, score: currentScore, maxBreak: currentBreak, endReason: reason };
    const updEx = { ...currentExercise, attempts: [...allAttempts, attempt] };
    onUpdateSession({ ...session, exercises: session.exercises.map(e => e.id === exercise.id ? updEx : e) });
    setCurrentAttemptBalls([]); setCurrentScore(0); setCurrentBreak(0); setHistory([]);
  }, [currentAttemptBalls, currentScore, currentBreak, allAttempts, currentExercise, session, exercise, onUpdateSession]);

  const handleMiss = () => endAttempt("miss");
  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setCurrentAttemptBalls(prev.balls); setCurrentScore(prev.score); setCurrentBreak(prev.brk);
    setHistory(h => h.slice(0, -1));
  };

  return (
    <div style={{ ...S.feltBg, minHeight: "100vh", color: "#fff" }}>
      <NavBar title={exercise.name} subtitle={`Попытка #${allAttempts.length + 1}`} onBack={onBack} />

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, padding: "12px 14px" }}>
        <StatBox label="Текущий" value={currentBreak} accent />
        <StatBox label="Лучший" value={bestBreakExercise} accent />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 14px 8px" }}>
        <StatBox label="Средний" value={avgBreak.toFixed(1)} accent />
        <StatBox label="Всего очков" value={totalScoreExercise} accent />
      </div>

      {/* Ball sequence */}
      <div style={{ padding: "4px 14px 8px", minHeight: 34 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {currentAttemptBalls.map((b, i) => <MiniDot key={i} ball={b} size={22} />)}
          {currentAttemptBalls.length === 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Нажмите на шар...</span>
          )}
        </div>
      </div>

      {/* Ball Buttons */}
      <div style={{ padding: "6px 14px 4px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {BALLS.map(b => <BallButton key={b.name} ball={b} onPress={addBall} disabled={isBallDisabled(b)} />)}
      </div>

      {/* Action Buttons */}
      <div style={{ padding: "14px", display: "flex", gap: 10 }}>
        <GlossyBtn onClick={handleMiss} color="red" style={{ flex: 1, fontSize: 15 }}>✕ Промах</GlossyBtn>
        <GlossyBtn onClick={handleUndo} disabled={!history.length} color="gray" style={{ flex: 1, fontSize: 15 }}>↩ Отмена</GlossyBtn>
      </div>

      {/* Attempt History */}
      {completedAttempts.length > 0 && (
        <div style={{ padding: "4px 14px 24px" }}>
          <div style={{ ...S.label, color: "#8bc48b", marginBottom: 6 }}>История попыток</div>
          {completedAttempts.slice().reverse().map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "7px 10px", marginBottom: 5,
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", minWidth: 24 }}>#{a.number}</span>
              <div style={{ display: "flex", gap: 3, flex: 1, flexWrap: "wrap" }}>
                {a.balls.slice(0, 14).map((b, j) => <MiniDot key={j} ball={b} size={16} />)}
                {a.balls.length > 14 && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>+{a.balls.length - 14}</span>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", minWidth: 28, textAlign: "right" }}>{a.score}</span>
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                background: "rgba(200,50,50,0.5)", color: "#ffaaaa", border: "1px solid rgba(200,50,50,0.3)",
              }}>ПРОМАХ</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats Screen ───

function StatsScreen({ sessions }) {
  const stats = calcStats(sessions);
  if (!stats) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8a8575" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 14 }}>Пока нет данных. Завершите хотя бы одну тренировку.</div>
      </div>
    );
  }

  const exerciseStats = EXERCISES.map(ex => ({ ...ex, stats: calcExerciseStats(sessions, ex.id) }));
  const chartSessions = sessions.filter(s => s.completed).slice(-15);
  const chartData = chartSessions.map(s => {
    const att = s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0));
    const b = att.map(a => a.score);
    return b.length ? b.reduce((a, c) => a + c, 0) / b.length : 0;
  });
  const chartMax = Math.max(1, ...chartData);

  const statItems = [
    { label: "Тренировок", value: stats.totalSessions },
    { label: "Общее время", value: formatDuration(stats.totalTime) },
    { label: "Лучший брейк", value: stats.bestBreak },
    { label: "Средний брейк", value: stats.avgBreak.toFixed(1) },
    { label: "Ср. (посл. 10)", value: stats.avgLast10.toFixed(1) },
    { label: "Попыток всего", value: stats.totalAttempts },
    { label: "% забивания", value: stats.potRate.toFixed(1) + "%" },
    { label: "Red→Color", value: stats.redColorConv.toFixed(1) + "%" },
    { label: "Серий > 20", value: stats.conv20.toFixed(1) + "%" },
    { label: "Серий > 30", value: stats.conv30.toFixed(1) + "%" },
    { label: "Стабильность", value: stats.consistency.toFixed(0) + "%" },
  ];

  return (
    <div style={{ padding: "14px", paddingBottom: 80 }}>
      <div style={S.card}>
        <div style={S.cardInner}>
          <div style={{ ...S.label, marginBottom: 8 }}>Общая статистика</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {statItems.map((s, i) => (
              <div key={i} style={S.insetBox}>
                <div style={S.label}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#2c2c2c" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div style={S.card}>
          <div style={S.cardInner}>
            <div style={{ ...S.label, marginBottom: 8 }}>Средний брейк по тренировкам</div>
            <div style={{
              ...S.insetBox,
              height: 110, display: "flex", alignItems: "flex-end", gap: 3, padding: "12px 8px 6px",
            }}>
              {chartData.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 8, color: "#8a8575" }}>{v.toFixed(0)}</span>
                  <div style={{
                    width: "100%", maxWidth: 24,
                    height: Math.max(4, (v / chartMax) * 70),
                    background: "linear-gradient(180deg, #6db33f 0%, #4a8522 100%)",
                    borderRadius: 3,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.15)",
                    border: "1px solid #3a6a18",
                  }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardInner}>
          <div style={{ ...S.label, marginBottom: 8 }}>По упражнениям</div>
          {exerciseStats.map(ex => (
            <div key={ex.id} style={{ ...S.insetBox, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2c2c2c", marginBottom: 4 }}>{ex.name}</div>
              {ex.stats ? (
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { l: "Попыток", v: ex.stats.total },
                    { l: "Средний", v: ex.stats.avg.toFixed(1) },
                    { l: "Лучший", v: ex.stats.best },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 9, color: "#8a8575", textTransform: "uppercase", fontWeight: 700 }}>{s.l}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#2c2c2c" }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#aaa" }}>Нет данных</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Session Detail ───

function SessionDetail({ session, onBack, onDelete }) {
  const exercises = session.exercises.filter(e => e.attempts.length > 0);
  const allAttempts = exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0));
  const breaks = allAttempts.map(a => a.score);
  const best = breaks.length ? Math.max(...breaks) : 0;
  const avg = breaks.length ? breaks.reduce((a, b) => a + b, 0) / breaks.length : 0;
  const total = breaks.reduce((a, b) => a + b, 0);

  return (
    <div style={S.page}>
      <NavBar
        title={session.name}
        subtitle={formatDuration(session.duration)}
        onBack={onBack}
        right={
          <button onClick={onDelete} style={{
            background: "linear-gradient(180deg, #d94444, #a82222)",
            border: "1px solid #8a1a1a", borderRadius: 6,
            color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 10px", cursor: "pointer",
            textShadow: "0 -1px 1px rgba(0,0,0,0.4)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
          }}>Удалить</button>
        }
      />

      <div style={{ display: "flex", gap: 8, padding: "12px 14px" }}>
        {[
          { l: "Очки", v: total },
          { l: "Лучший", v: best },
          { l: "Средний", v: avg.toFixed(1) },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, flex: 1, marginBottom: 0 }}>
            <div style={{ ...S.cardInner, textAlign: "center", padding: "10px 8px" }}>
              <div style={S.label}>{s.l}</div>
              <div style={S.bigNum}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "4px 14px 80px" }}>
        {exercises.map(ex => {
          const exInfo = EXERCISES.find(e => e.id === ex.id) || { name: ex.id };
          const attempts = ex.attempts.filter(a => a.balls.length > 0);
          return (
            <div key={ex.id} style={S.card}>
              <div style={S.cardInner}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>{exInfo.name}</div>
                {attempts.map((a, i) => (
                  <div key={i} style={{
                    ...S.insetBox, marginBottom: 6,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 12, color: "#8a8575", minWidth: 24 }}>#{a.number}</span>
                    <div style={{ display: "flex", gap: 3, flex: 1, flexWrap: "wrap" }}>
                      {a.balls.slice(0, 15).map((b, j) => <MiniDot key={j} ball={BALLS.find(x => x.name === b.name) || b} size={14} />)}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#2c2c2c" }}>{a.score}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ───

export default function SnookerTrainer() {
  const [data, setData] = useState({ sessions: [] });
  const [tab, setTab] = useState("sessions");
  const [activeSession, setActiveSession] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
  const [viewSession, setViewSession] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setData(loadData()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) saveData(data); }, [data, loaded]);

  const updateData = (fn) => setData(prev => ({ ...fn(prev) }));

  const createSession = () => {
    const now = new Date();
    const session = { id: Date.now().toString(), name: formatDate(now), date: now.toISOString(), startTime: now.getTime(), duration: 0, completed: false, exercises: [] };
    updateData(d => ({ ...d, sessions: [...d.sessions, session] }));
    setActiveSession(session);
  };

  const addExercise = (ex) => {
    const updated = { ...activeSession, exercises: [...activeSession.exercises, { id: ex.id, name: ex.name, attempts: [] }] };
    updateData(d => ({ ...d, sessions: d.sessions.map(s => s.id === updated.id ? updated : s) }));
    setActiveSession(updated);
    setActiveExercise(ex);
  };

  const updateSession = (updated) => {
    updateData(d => ({ ...d, sessions: d.sessions.map(s => s.id === updated.id ? updated : s) }));
    setActiveSession(updated);
  };

  const finishSession = () => {
    const updated = { ...activeSession, completed: true, duration: Date.now() - activeSession.startTime };
    updateData(d => ({ ...d, sessions: d.sessions.map(s => s.id === updated.id ? updated : s) }));
    setActiveSession(null); setActiveExercise(null);
  };

  const deleteSession = (id) => { updateData(d => ({ ...d, sessions: d.sessions.filter(s => s.id !== id) })); setViewSession(null); };

  if (activeExercise && activeSession) {
    return <ExerciseScreen exercise={activeExercise} session={activeSession} onBack={() => setActiveExercise(null)} onUpdateSession={updateSession} />;
  }

  if (activeSession) {
    const allAttempts = activeSession.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0));
    const totalScore = allAttempts.reduce((s, a) => s + a.score, 0);
    const bestBreak = Math.max(0, ...allAttempts.map(a => a.maxBreak || a.score));

    return (
      <div style={S.page}>
        <NavBar title={activeSession.name} subtitle="Текущая тренировка" />

        <div style={{ display: "flex", gap: 8, padding: "12px 14px" }}>
          {[
            { l: "Очки", v: totalScore },
            { l: "Лучший брейк", v: bestBreak },
            { l: "Упражнений", v: activeSession.exercises.length },
          ].map((s, i) => (
            <div key={i} style={{ ...S.card, flex: 1, marginBottom: 0 }}>
              <div style={{ ...S.cardInner, textAlign: "center", padding: "10px 8px" }}>
                <div style={S.label}>{s.l}</div>
                <div style={S.bigNum}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "8px 14px" }}>
          <div style={S.card}>
            <div style={S.cardInner}>
              <div style={{ ...S.label, marginBottom: 8 }}>Выберите упражнение</div>
              {EXERCISES.map((ex, idx) => {
                const existing = activeSession.exercises.find(e => e.id === ex.id);
                const count = existing ? existing.attempts.filter(a => a.balls.length > 0).length : 0;
                return (
                  <button key={ex.id} onClick={() => existing ? setActiveExercise(ex) : addExercise(ex)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                    background: "transparent",
                    borderTop: idx > 0 ? "1px solid #d8d4c8" : "none",
                    borderLeft: "none", borderRight: "none", borderBottom: "none",
                    padding: "12px 4px", cursor: "pointer", textAlign: "left",
                    fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#2c2c2c" }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: "#8a8575" }}>{ex.description}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {count > 0 && (
                        <span style={{
                          background: "linear-gradient(180deg, #6db33f, #4a8522)",
                          borderRadius: 12, padding: "2px 8px",
                          fontSize: 12, fontWeight: 700, color: "#fff",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                          textShadow: "0 -1px 0 rgba(0,0,0,0.3)",
                          border: "1px solid #3a6a18",
                        }}>{count}</span>
                      )}
                      <span style={{ color: "#b8b5a8", fontSize: 18 }}>›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {activeSession.exercises.filter(e => e.attempts.length > 0).length > 0 && (
          <div style={{ padding: "0 14px" }}>
            <div style={S.card}>
              <div style={S.cardInner}>
                <div style={{ ...S.label, marginBottom: 6 }}>В этой тренировке</div>
                {activeSession.exercises.filter(e => e.attempts.length > 0).map(ex => {
                  const info = EXERCISES.find(e => e.id === ex.id);
                  const attempts = ex.attempts.filter(a => a.balls.length > 0);
                  const scores = attempts.map(a => a.score);
                  return (
                    <div key={ex.id} style={{
                      ...S.insetBox, marginBottom: 6,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#2c2c2c" }}>{info?.name || ex.id}</span>
                      <span style={{ fontSize: 12, color: "#8a8575" }}>
                        {attempts.length} попыт. · лучший: {scores.length ? Math.max(...scores) : 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "8px 14px 24px" }}>
          <GlossyBtn onClick={finishSession} color="green" style={{ width: "100%", fontSize: 16, padding: "14px" }}>
            ✓ Завершить тренировку
          </GlossyBtn>
        </div>
      </div>
    );
  }

  if (viewSession) {
    const session = data.sessions.find(s => s.id === viewSession);
    if (session) return <SessionDetail session={session} onBack={() => setViewSession(null)} onDelete={() => deleteSession(session.id)} />;
  }

  const completedSessions = data.sessions.filter(s => s.completed).reverse();

  return (
    <div style={S.page}>
      <div style={{ ...S.navbar, padding: "16px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "radial-gradient(circle at 38% 30%, #4ade80, #1a5c2a)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.3)",
            border: "1px solid #0d3d12",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15,
          }}>🎱</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            Snooker<span style={{ fontWeight: 400 }}>Lab</span>
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Учёт тренировок и прогресса</div>
      </div>

      <div style={{ padding: "10px 14px 6px" }}>
        <div style={{
          display: "flex", borderRadius: 7, overflow: "hidden",
          border: "1px solid #3a6a18",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          {[
            { id: "sessions", label: "Тренировки" },
            { id: "stats", label: "Статистика" },
          ].map((t, i) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "8px 0",
              background: tab === t.id
                ? "linear-gradient(180deg, #6db33f 0%, #5a9a2f 48%, #4a8522 52%, #5a9a2f 100%)"
                : "linear-gradient(180deg, #f8f8f5 0%, #e8e5d8 100%)",
              border: "none",
              borderRight: i === 0 ? "1px solid #3a6a18" : "none",
              color: tab === t.id ? "#fff" : "#555",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              textShadow: tab === t.id ? "0 -1px 1px rgba(0,0,0,0.4)" : "0 1px 0 rgba(255,255,255,0.8)",
              fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === "stats" ? (
        <StatsScreen sessions={data.sessions} />
      ) : (
        <div style={{ padding: "8px 14px", paddingBottom: 80 }}>
          <GlossyBtn onClick={createSession} color="green" style={{ width: "100%", fontSize: 16, padding: "14px", marginBottom: 14 }}>
            + Новая тренировка
          </GlossyBtn>

          {completedSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#8a8575" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🟢</div>
              <div style={{ fontSize: 14 }}>Начните первую тренировку!</div>
            </div>
          ) : (
            <div style={S.card}>
              <div style={{ overflow: "hidden", borderRadius: 10 }}>
                {completedSessions.map((s, idx) => {
                  const attempts = s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0));
                  const best = Math.max(0, ...attempts.map(a => a.maxBreak || a.score));
                  return (
                    <button key={s.id} onClick={() => setViewSession(s.id)} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                      background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                      borderTop: idx > 0 ? "1px solid #d8d4c8" : "none",
                      borderLeft: "none", borderRight: "none", borderBottom: "none",
                      padding: "12px 14px", cursor: "pointer", textAlign: "left",
                      fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#2c2c2c" }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "#8a8575" }}>
                          {s.exercises.length} упр. · {attempts.length} попыт. · {formatDuration(s.duration)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#4a8522" }}>{best}</div>
                          <div style={{ fontSize: 9, color: "#8a8575", textTransform: "uppercase" }}>лучший</div>
                        </div>
                        <span style={{ color: "#b8b5a8", fontSize: 18 }}>›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
