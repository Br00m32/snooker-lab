import { useState, useEffect, useCallback } from "react";

const BALLS = [
  { name: "Red", points: 1, color: "#DC2626" },
  { name: "Yellow", points: 2, color: "#EAB308" },
  { name: "Green", points: 3, color: "#16A34A" },
  { name: "Brown", points: 4, color: "#92400E" },
  { name: "Blue", points: 5, color: "#2563EB" },
  { name: "Pink", points: 6, color: "#EC4899" },
  { name: "Black", points: 7, color: "#1a1a1a" },
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
  return hrs > 0 ? `${hrs}ч ${mins % 60}м` : `${mins}м`;
};

const STORAGE_KEY = "snooker_data";
const loadData = () => { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return { sessions: [] }; };
const saveData = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} };

const F = "'JetBrains Mono', monospace";

// ─── Stats calculation ───

const calcStats = (sessions) => {
  const completed = sessions.filter(s => s.completed);
  if (!completed.length) return null;
  const allAttempts = completed.flatMap(s => s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0)));
  const allAttemptsAll = completed.flatMap(s => s.exercises.flatMap(e => e.attempts));
  const allBreaks = allAttempts.map(a => a.score);
  const best = Math.max(0, ...allBreaks);
  const avg = allBreaks.length ? allBreaks.reduce((a, b) => a + b, 0) / allBreaks.length : 0;
  const totalTime = completed.reduce((s, c) => s + (c.duration || 0), 0);
  const totalBalls = allAttempts.reduce((s, a) => s + a.balls.length, 0);
  const totalMisses = allAttemptsAll.filter(a => a.endReason === "miss").length;
  const potRate = (totalBalls + totalMisses) > 0 ? totalBalls / (totalBalls + totalMisses) * 100 : 0;
  const conv20 = allBreaks.length ? allBreaks.filter(b => b >= 20).length / allBreaks.length * 100 : 0;
  const conv30 = allBreaks.length ? allBreaks.filter(b => b >= 30).length / allBreaks.length * 100 : 0;
  const consistency = best > 0 ? avg / best * 100 : 0;
  let redTotal = 0, redConverted = 0;
  allAttempts.forEach(a => {
    for (let i = 0; i < a.balls.length; i++) {
      if (a.balls[i].name === "Red") { redTotal++; if (i < a.balls.length - 1 && a.balls[i + 1].name !== "Red") redConverted++; }
    }
  });
  return { totalSessions: completed.length, totalTime, bestBreak: best, avgBreak: avg, potRate, conv20, conv30, consistency, redColorConv: redTotal > 0 ? redConverted / redTotal * 100 : 0, totalAttempts: allAttemptsAll.length };
};

const calcExerciseStats = (sessions, eid) => {
  const att = sessions.filter(s => s.completed).flatMap(s => s.exercises.filter(e => e.id === eid).flatMap(e => e.attempts.filter(a => a.balls.length > 0)));
  if (!att.length) return null;
  const b = att.map(a => a.score);
  return { total: att.length, avg: b.reduce((a, c) => a + c, 0) / b.length, best: Math.max(...b) };
};

// Straight blue specific stats
const calcStraightBlueStats = (sessions) => {
  const att = sessions.filter(s => s.completed).flatMap(s => s.exercises.filter(e => e.id === "straight_blue").flatMap(e => e.attempts));
  if (!att.length) return null;
  const hits = att.filter(a => a.endReason === "hit").length;
  const misses = att.filter(a => a.endReason === "miss").length;
  const total = hits + misses;
  return { total, hits, pct: total > 0 ? hits / total * 100 : 0 };
};

// ─── Ball Button ───

function BallButton({ ball, onPress, disabled }) {
  return (
    <button onClick={() => onPress(ball)} disabled={disabled} style={{
      width: 88, height: 88, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${ball.color}ee, ${ball.color}88)`,
      border: ball.name === "Black" ? "2px solid #444" : "2px solid rgba(255,255,255,0.15)",
      color: ball.name === "Yellow" ? "#1a1a1a" : "#fff",
      fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.3 : 1,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
      boxShadow: disabled ? "none" : "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2)",
      fontFamily: F, WebkitTapHighlightColor: "transparent", transition: "transform 0.1s",
    }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.92)"; }}
      onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{ball.points}</span>
      <span style={{ fontSize: 10, opacity: 0.85, textTransform: "uppercase", letterSpacing: 1 }}>{ball.name}</span>
    </button>
  );
}

// ─── Straight Blue Screen ───

function StraightBlueScreen({ session, onBack, onUpdateSession, onFinishExercise }) {
  const currentExercise = session.exercises.find(e => e.id === "straight_blue");
  const allAttempts = currentExercise?.attempts || [];
  const hits = allAttempts.filter(a => a.endReason === "hit").length;
  const misses = allAttempts.filter(a => a.endReason === "miss").length;
  const total = hits + misses;
  const pct = total > 0 ? hits / total * 100 : 0;

  const record = (result) => {
    const blueBall = BALLS.find(b => b.name === "Blue");
    const attempt = {
      number: allAttempts.length + 1,
      balls: result === "hit" ? [blueBall] : [],
      score: result === "hit" ? 5 : 0,
      maxBreak: result === "hit" ? 5 : 0,
      endReason: result,
    };
    const updEx = { ...currentExercise, attempts: [...allAttempts, attempt] };
    onUpdateSession({ ...session, exercises: session.exercises.map(e => e.id === "straight_blue" ? updEx : e) });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8e8e8", fontFamily: F }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a2a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#4ade80", fontSize: 22, cursor: "pointer", padding: 4 }}>←</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>Straight Blue</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Попытка #{allAttempts.length + 1}</div>
          </div>
        </div>
        <button onClick={onFinishExercise} style={{
          background: "none", border: "1px solid #4ade8044", borderRadius: 8,
          color: "#4ade80", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer", fontFamily: F,
        }}>Завершить</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "16px" }}>
        {[
          { l: "Забито", v: hits, c: "#4ade80" },
          { l: "Промахи", v: misses, c: "#f87171" },
          { l: "Точность", v: pct.toFixed(0) + "%", c: "#d1d5db" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#111a11", borderRadius: 10, padding: "10px 12px", border: "1px solid #1a2a1a", textAlign: "center" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 16px 8px", display: "flex", gap: 16, justifyContent: "center" }}>
        {[
          { label: "ЗАБИЛ", reason: "hit", bg: "radial-gradient(circle at 35% 35%, #2563EBee, #2563EB88)", border: "#1a4aaa", shadow: "rgba(37,99,235,0.4)" },
          { label: "ПРОМАХ", reason: "miss", bg: "radial-gradient(circle at 35% 35%, #dc2626cc, #dc262666)", border: "#aa1a1a", shadow: "rgba(220,38,38,0.3)" },
        ].map(btn => (
          <button key={btn.reason} onClick={() => record(btn.reason)} style={{
            width: 140, height: 140, borderRadius: "50%", background: btn.bg,
            border: `3px solid ${btn.border}`, color: "#fff", fontSize: 18, fontWeight: 800,
            cursor: "pointer", fontFamily: F,
            boxShadow: `0 6px 20px ${btn.shadow}, inset 0 2px 4px rgba(255,255,255,0.15)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent", transition: "transform 0.08s",
          }}
            onPointerDown={e => { e.currentTarget.style.transform = "scale(0.93)"; }}
            onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
            onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >{btn.label}</button>
        ))}
      </div>

      {total > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ background: "#1a0a0a", borderRadius: 6, height: 8, overflow: "hidden", border: "1px solid #1a2a1a" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #2563EB, #4ade80)", borderRadius: 6, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", textAlign: "center", marginTop: 4 }}>{hits} из {total}</div>
        </div>
      )}

      {allAttempts.length > 0 && (
        <div style={{ padding: "8px 16px 24px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>Последние попытки</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {allAttempts.map((a, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 6,
                background: a.endReason === "hit" ? "#2563EB44" : "#dc262644",
                border: a.endReason === "hit" ? "1px solid #2563EB66" : "1px solid #dc262666",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: a.endReason === "hit" ? "#60a5fa" : "#f87171",
              }}>{a.endReason === "hit" ? "✓" : "✕"}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Screen (Line-up, The T) ───

function ExerciseScreen({ exercise, session, onBack, onUpdateSession, onFinishExercise }) {
  const currentExercise = session.exercises.find(e => e.id === exercise.id);
  const [currentAttemptBalls, setCurrentAttemptBalls] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentBreak, setCurrentBreak] = useState(0);
  const [history, setHistory] = useState([]);

  const allAttempts = currentExercise?.attempts || [];
  const attemptsWithBalls = allAttempts.filter(a => a.balls.length > 0);
  const bestBreakExercise = Math.max(0, ...attemptsWithBalls.map(a => a.maxBreak || a.score), currentBreak);
  const avgBreak = attemptsWithBalls.length ? attemptsWithBalls.reduce((s, a) => s + a.score, 0) / attemptsWithBalls.length : 0;
  const totalBallsEx = attemptsWithBalls.reduce((s, a) => s + a.balls.length, 0) + currentAttemptBalls.length;
  const totalMissesEx = allAttempts.filter(a => a.endReason === "miss").length;
  const potRateEx = (totalBallsEx + totalMissesEx) > 0 ? (totalBallsEx / (totalBallsEx + totalMissesEx) * 100) : 0;

  const lastBall = currentAttemptBalls.length > 0 ? currentAttemptBalls[currentAttemptBalls.length - 1] : null;
  const isStart = currentAttemptBalls.length === 0;
  const isBallDisabled = (ball) => {
    if (isStart && ball.name !== "Red") return true;
    if (lastBall?.name === "Red" && ball.name === "Red") return true;
    if (lastBall && lastBall.name !== "Red" && ball.name !== "Red") return true;
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

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setCurrentAttemptBalls(prev.balls); setCurrentScore(prev.score); setCurrentBreak(prev.brk);
    setHistory(h => h.slice(0, -1));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8e8e8", fontFamily: F }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a2a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#4ade80", fontSize: 22, cursor: "pointer", padding: 4 }}>←</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>{exercise.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Попытка #{allAttempts.length + 1}</div>
          </div>
        </div>
        <button onClick={() => {
          if (currentAttemptBalls.length > 0) {
            const attempt = { number: allAttempts.length + 1, balls: currentAttemptBalls, score: currentScore, maxBreak: currentBreak, endReason: "manual" };
            const updEx = { ...currentExercise, attempts: [...allAttempts, attempt] };
            onUpdateSession({ ...session, exercises: session.exercises.map(e => e.id === exercise.id ? updEx : e) });
          }
          onFinishExercise();
        }} style={{
          background: "none", border: "1px solid #4ade8044", borderRadius: 8,
          color: "#4ade80", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer", fontFamily: F,
        }}>Завершить</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 16px" }}>
        {[
          { label: "Текущий брейк", value: currentBreak, accent: true },
          { label: "Лучший брейк", value: bestBreakExercise },
          { label: "Средний брейк", value: avgBreak.toFixed(1) },
          { label: "% забивания", value: potRateEx.toFixed(1) + "%" },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.accent ? "linear-gradient(135deg, #064e3b, #022c22)" : "#111a11",
            borderRadius: 10, padding: "10px 12px",
            border: s.accent ? "1px solid #4ade8044" : "1px solid #1a2a1a",
          }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: s.accent ? 28 : 20, fontWeight: 800, color: s.accent ? "#4ade80" : "#d1d5db" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "4px 16px 8px", minHeight: 36 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {currentAttemptBalls.map((b, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: "50%", background: b.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: b.name === "Yellow" ? "#1a1a1a" : "#fff",
              border: b.name === "Black" ? "1px solid #444" : "none",
            }}>{b.points}</div>
          ))}
          {currentAttemptBalls.length === 0 && <span style={{ fontSize: 11, color: "#374151" }}>Нажмите на шар для начала...</span>}
        </div>
      </div>

      <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {BALLS.map(b => <BallButton key={b.name} ball={b} onPress={addBall} disabled={isBallDisabled(b)} />)}
      </div>

      <div style={{ padding: "16px", display: "flex", gap: 10 }}>
        <button onClick={() => endAttempt("miss")} style={{
          flex: 1, padding: "16px", borderRadius: 10, border: "1px solid #dc262644",
          background: "#1a0a0a", color: "#f87171", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: F,
        }}>✕ ПРОМАХ</button>
        <button onClick={handleUndo} disabled={!history.length} style={{
          flex: 1, padding: "16px", borderRadius: 10, border: "1px solid #374151",
          background: "#111", color: history.length ? "#9ca3af" : "#374151", fontSize: 16, fontWeight: 700,
          cursor: history.length ? "pointer" : "not-allowed", fontFamily: F,
        }}>↩ ОТМЕНА</button>
      </div>

      {allAttempts.length > 0 && (
        <div style={{ padding: "8px 16px 24px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>История попыток</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...allAttempts].reverse().map((a, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#111a11", borderRadius: 8, padding: "8px 12px", border: "1px solid #1a2a1a",
              }}>
                <span style={{ fontSize: 12, color: "#6b7280", minWidth: 28 }}>#{a.number}</span>
                <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", justifyContent: "center" }}>
                  {a.balls.length > 0 ? (
                    <>
                      {a.balls.slice(0, 14).map((b, j) => (
                        <div key={j} style={{ width: 16, height: 16, borderRadius: "50%", background: b.color, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", color: b.name === "Yellow" ? "#1a1a1a" : "#fff", border: b.name === "Black" ? "1px solid #333" : "none" }}>{b.points}</div>
                      ))}
                      {a.balls.length > 14 && <span style={{ fontSize: 10, color: "#6b7280" }}>+{a.balls.length - 14}</span>}
                    </>
                  ) : <span style={{ fontSize: 10, color: "#374151" }}>—</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", minWidth: 32, textAlign: "right" }}>{a.score}</span>
                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, marginLeft: 6, background: "#7f1d1d", color: "#fca5a5" }}>ПРОМАХ</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stats Screen ───

function StatsScreen({ sessions }) {
  const [period, setPeriod] = useState("all");
  const now = new Date();
  const filterByPeriod = (s) => {
    if (period === "all") return true;
    const d = new Date(s.date);
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "week") { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    return true;
  };
  const filtered = sessions.filter(filterByPeriod);
  const stats = calcStats(filtered);
  const exerciseStats = EXERCISES.map(ex => ({ ...ex, stats: ex.id === "straight_blue" ? calcStraightBlueStats(filtered) : calcExerciseStats(filtered, ex.id) }));
  const chartSessions = filtered.filter(s => s.completed).slice(-15);
  const chartData = chartSessions.map(s => {
    const b = s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0)).map(a => a.score);
    return b.length ? b.reduce((a, c) => a + c, 0) / b.length : 0;
  });
  const chartMax = Math.max(1, ...chartData);

  return (
    <div style={{ padding: "16px", paddingBottom: 80 }}>
      {/* Period tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: "1px solid #1a2a1a" }}>
        {[{ id: "all", l: "Всё время" }, { id: "month", l: "Месяц" }, { id: "week", l: "7 дней" }].map((p, i) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            flex: 1, padding: "8px 0", background: period === p.id ? "#4ade80" : "#111a11",
            border: "none", borderRight: i < 2 ? "1px solid #1a2a1a" : "none",
            color: period === p.id ? "#0a0f0a" : "#6b7280",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F,
          }}>{p.l}</button>
        ))}
      </div>

      {!stats ? (
        <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14 }}>Нет данных за выбранный период</div>
        </div>
      ) : (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Тренировок", value: stats.totalSessions },
            { label: "Общее время", value: formatDuration(stats.totalTime) },
            { label: "Лучший брейк", value: stats.bestBreak },
            { label: "Средний брейк", value: stats.avgBreak.toFixed(1) },
            { label: "Попыток всего", value: stats.totalAttempts },
            { label: "% забивания", value: stats.potRate.toFixed(1) + "%" },
            { label: "Red→Color %", value: stats.redColorConv.toFixed(1) + "%" },
            { label: "Серий > 20", value: stats.conv20.toFixed(1) + "%" },
            { label: "Серий > 30", value: stats.conv30.toFixed(1) + "%" },
            { label: "Стабильность", value: stats.consistency.toFixed(0) + "%" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#111a11", borderRadius: 10, padding: "10px 12px", border: "1px solid #1a2a1a" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#d1d5db" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {chartData.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>Средний брейк по тренировкам</div>
            <div style={{ background: "#111a11", borderRadius: 10, padding: "16px 12px 8px", border: "1px solid #1a2a1a", height: 120, display: "flex", alignItems: "flex-end", gap: 3 }}>
              {chartData.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 8, color: "#6b7280" }}>{v.toFixed(0)}</span>
                  <div style={{ width: "100%", maxWidth: 28, height: Math.max(4, (v / chartMax) * 80), background: "linear-gradient(to top, #064e3b, #4ade80)", borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>По упражнениям</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {exerciseStats.map(ex => (
            <div key={ex.id} style={{ background: "#111a11", borderRadius: 10, padding: 12, border: "1px solid #1a2a1a" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#d1d5db", marginBottom: 6 }}>{ex.name}</div>
              {ex.stats ? (
                ex.id === "straight_blue" ? (
                  <div style={{ display: "flex", gap: 16 }}>
                    {[{ l: "Попыток", v: ex.stats.total }, { l: "Забито", v: ex.stats.hits }, { l: "Точность", v: ex.stats.pct.toFixed(0) + "%" }].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" }}>{s.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: i === 2 ? "#4ade80" : "#9ca3af" }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 16 }}>
                    {[{ l: "Попыток", v: ex.stats.total }, { l: "Средний", v: ex.stats.avg.toFixed(1) }, { l: "Лучший", v: ex.stats.best }].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" }}>{s.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: i === 2 ? "#4ade80" : "#9ca3af" }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                )
              ) : <div style={{ fontSize: 12, color: "#374151" }}>Нет данных</div>}
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}

// ─── Settings Screen ───

function SettingsScreen({ data, onImport }) {
  const [importStatus, setImportStatus] = useState(null);

  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `snooker-lab-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed.sessions || !Array.isArray(parsed.sessions)) {
            setImportStatus("error");
            return;
          }
          onImport(parsed);
          setImportStatus("success");
          setTimeout(() => setImportStatus(null), 3000);
        } catch {
          setImportStatus("error");
          setTimeout(() => setImportStatus(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const sessionCount = data.sessions.filter(s => s.completed).length;
  const totalAttempts = data.sessions.flatMap(s => s.exercises.flatMap(e => e.attempts)).length;
  const dataSize = new Blob([JSON.stringify(data)]).size;
  const sizeStr = dataSize < 1024 ? `${dataSize} Б` : dataSize < 1048576 ? `${(dataSize / 1024).toFixed(1)} КБ` : `${(dataSize / 1048576).toFixed(1)} МБ`;

  return (
    <div style={{ padding: "16px", paddingBottom: 80 }}>
      {/* Data info */}
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>Данные</div>
      <div style={{ background: "#111a11", borderRadius: 10, padding: 14, border: "1px solid #1a2a1a", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>Тренировок</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d1d5db" }}>{sessionCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>Попыток</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d1d5db" }}>{totalAttempts}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>Размер данных</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d1d5db" }}>{sizeStr}</span>
        </div>
      </div>

      {/* Export / Import */}
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>Резервная копия</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <button onClick={handleExport} style={{
          width: "100%", padding: "14px", borderRadius: 10,
          background: "linear-gradient(135deg, #064e3b, #022c22)",
          border: "1px solid #4ade8044", color: "#4ade80",
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: F,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Скачать бэкап
        </button>
        <button onClick={handleImport} style={{
          width: "100%", padding: "14px", borderRadius: 10,
          background: "#111a11", border: "1px solid #1a2a1a",
          color: "#d1d5db", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: F,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Загрузить бэкап
        </button>
      </div>

      {importStatus && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: importStatus === "success" ? "#064e3b" : "#7f1d1d",
          border: importStatus === "success" ? "1px solid #4ade8044" : "1px solid #dc262644",
          color: importStatus === "success" ? "#4ade80" : "#fca5a5",
          fontSize: 13, fontWeight: 600, textAlign: "center",
        }}>
          {importStatus === "success" ? "✓ Данные восстановлены" : "✕ Ошибка: неверный формат файла"}
        </div>
      )}

      {/* About */}
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>О приложении</div>
      <div style={{ background: "#111a11", borderRadius: 10, padding: 14, border: "1px solid #1a2a1a" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e8e8e8", marginBottom: 4 }}>
          Snooker<span style={{ color: "#4ade80" }}>Lab</span>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
          Учёт тренировок и прогресса по снукеру. Данные хранятся локально на устройстве. Используйте бэкап для сохранения данных.
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
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8e8e8", fontFamily: F }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a2a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#4ade80", fontSize: 22, cursor: "pointer" }}>←</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{session.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{formatDuration(session.duration)}</div>
          </div>
        </div>
        <button onClick={onDelete} style={{
          background: "none", border: "1px solid #7f1d1d", borderRadius: 8,
          color: "#f87171", fontSize: 11, padding: "6px 10px", cursor: "pointer", fontFamily: F,
        }}>Удалить</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 16px" }}>
        {[{ l: "Очки", v: total }, { l: "Лучший", v: best, a: true }, { l: "Средний", v: avg.toFixed(1) }].map((s, i) => (
          <div key={i} style={{ background: "#111a11", borderRadius: 10, padding: 10, border: "1px solid #1a2a1a" }}>
            <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.a ? "#4ade80" : "#d1d5db" }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 16px 80px" }}>
        {exercises.map(ex => {
          const exInfo = EXERCISES.find(e => e.id === ex.id) || { name: ex.id };
          const isSB = ex.id === "straight_blue";
          const attempts = isSB ? ex.attempts : ex.attempts.filter(a => a.balls.length > 0);
          return (
            <div key={ex.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>{exInfo.name}</div>
              {isSB ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {attempts.map((a, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: a.endReason === "hit" ? "#2563EB44" : "#dc262644",
                      border: a.endReason === "hit" ? "1px solid #2563EB66" : "1px solid #dc262666",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: a.endReason === "hit" ? "#60a5fa" : "#f87171",
                    }}>{a.endReason === "hit" ? "✓" : "✕"}</div>
                  ))}
                </div>
              ) : attempts.map((a, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#111a11", borderRadius: 8, padding: "8px 12px", marginBottom: 6, border: "1px solid #1a2a1a",
                }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>#{a.number}</span>
                  <div style={{ display: "flex", gap: 3, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
                    {a.balls.slice(0, 15).map((b, j) => (
                      <div key={j} style={{ width: 14, height: 14, borderRadius: "50%", background: b.color, fontSize: 7, display: "flex", alignItems: "center", justifyContent: "center", color: b.name === "Yellow" ? "#1a1a1a" : "#fff" }}>{b.points}</div>
                    ))}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>{a.score}</span>
                </div>
              ))}
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
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { setData(loadData()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) saveData(data); }, [data, loaded]);
  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(Date.now() - activeSession.startTime), 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

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
    setActiveSession(updated); setActiveExercise(ex);
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

  // Straight Blue gets its own screen
  if (activeExercise && activeSession && activeExercise.id === "straight_blue") {
    return <StraightBlueScreen session={activeSession} onBack={() => setActiveExercise(null)} onUpdateSession={updateSession} onFinishExercise={() => setActiveExercise(null)} />;
  }

  // Regular exercise screen
  if (activeExercise && activeSession) {
    return <ExerciseScreen exercise={activeExercise} session={activeSession} onBack={() => setActiveExercise(null)} onUpdateSession={updateSession} onFinishExercise={() => setActiveExercise(null)} />;
  }

  // Active session — pick exercise
  if (activeSession) {
    const allAttempts = activeSession.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0));
    const allAttemptsAll = activeSession.exercises.flatMap(e => e.attempts);
    const bestBreak = Math.max(0, ...allAttempts.map(a => a.maxBreak || a.score));
    const totalBalls = allAttempts.reduce((s, a) => s + a.balls.length, 0);
    const totalMisses = allAttemptsAll.filter(a => a.endReason === "miss").length;
    const potRate = (totalBalls + totalMisses) > 0 ? totalBalls / (totalBalls + totalMisses) * 100 : 0;

    return (
      <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8e8e8", fontFamily: F }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #1a2a1a" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#6b7280", marginBottom: 4 }}>Текущая тренировка</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{activeSession.name}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 16px" }}>
          {[
            { l: "Лучший брейк", v: bestBreak, accent: true },
            { l: "% забивания", v: potRate.toFixed(1) + "%" },
            { l: "Время", v: formatDuration(elapsed) },
          ].map((s, i) => (
            <div key={i} style={{ background: "#111a11", borderRadius: 10, padding: 10, border: "1px solid #1a2a1a", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" }}>{s.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.accent ? "#4ade80" : "#d1d5db" }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 10 }}>Выберите упражнение</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EXERCISES.map(ex => {
              const existing = activeSession.exercises.find(e => e.id === ex.id);
              const count = existing ? existing.attempts.length : 0;
              return (
                <button key={ex.id} onClick={() => existing ? setActiveExercise(ex) : addExercise(ex)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#111a11", borderRadius: 10, padding: "14px 16px",
                  border: "1px solid #1a2a1a", cursor: "pointer", color: "#e8e8e8", fontFamily: F, textAlign: "left",
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{ex.description}</div>
                  </div>
                  {count > 0 && <div style={{ background: "#064e3b", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#4ade80" }}>{count}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {activeSession.exercises.filter(e => e.attempts.length > 0).length > 0 && (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", marginBottom: 8 }}>В этой тренировке</div>
            {activeSession.exercises.filter(e => e.attempts.length > 0).map(ex => {
              const info = EXERCISES.find(e => e.id === ex.id);
              const isSB = ex.id === "straight_blue";
              const attempts = isSB ? ex.attempts : ex.attempts.filter(a => a.balls.length > 0);
              const display = isSB
                ? `${ex.attempts.filter(a => a.endReason === "hit").length}/${ex.attempts.length} забито`
                : `${attempts.length} попыт. · лучший: ${attempts.length ? Math.max(...attempts.map(a => a.score)) : 0}`;
              return (
                <div key={ex.id} style={{
                  background: "#111a11", borderRadius: 10, padding: "10px 12px",
                  border: "1px solid #1a2a1a", marginBottom: 6,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{info?.name || ex.id}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{display}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: "16px" }}>
          <button onClick={finishSession} style={{
            width: "100%", padding: "16px", borderRadius: 12,
            background: "linear-gradient(135deg, #064e3b, #022c22)",
            border: "1px solid #4ade8044", color: "#4ade80",
            fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: F,
          }}>✓ ЗАВЕРШИТЬ ТРЕНИРОВКУ</button>
        </div>
      </div>
    );
  }

  if (viewSession) {
    const session = data.sessions.find(s => s.id === viewSession);
    if (session) return <SessionDetail session={session} onBack={() => setViewSession(null)} onDelete={() => deleteSession(session.id)} />;
  }

  const completedSessions = data.sessions.filter(s => s.completed).reverse();

  const TabIcon = ({ type, active }) => {
    const color = active ? "#4ade80" : "#6b7280";
    if (type === "sessions") return (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    );
    if (type === "stats") return (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    );
    return (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8e8e8", fontFamily: F, paddingTop: 72, paddingBottom: "calc(70px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
        padding: "env(safe-area-inset-top, 12px) 16px 10px",
        background: "rgba(10, 15, 10, 0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid #1a2a1a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #4ade80, #064e3b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎱</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, margin: 0, color: "#e8e8e8" }}>Snooker<span style={{ color: "#4ade80" }}>Lab</span></h1>
        </div>
        <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Учёт тренировок и прогресса</p>
      </div>

      {tab === "stats" ? <StatsScreen sessions={data.sessions} /> :
       tab === "settings" ? <SettingsScreen data={data} onImport={(d) => { setData(d); saveData(d); }} /> : (
        <div style={{ padding: "16px" }}>
          <button onClick={createSession} style={{
            width: "100%", padding: "16px", borderRadius: 12,
            background: "linear-gradient(135deg, #064e3b, #022c22)",
            border: "1px solid #4ade8044", color: "#4ade80",
            fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: F, marginBottom: 20,
          }}>+ НОВАЯ ТРЕНИРОВКА</button>

          {completedSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#374151" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🟢</div>
              <div style={{ fontSize: 13 }}>Начните первую тренировку!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completedSessions.map(s => {
                const attempts = s.exercises.flatMap(e => e.attempts.filter(a => a.balls.length > 0));
                const best = Math.max(0, ...attempts.map(a => a.maxBreak || a.score));
                return (
                  <button key={s.id} onClick={() => setViewSession(s.id)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#111a11", borderRadius: 10, padding: "12px 14px",
                    border: "1px solid #1a2a1a", cursor: "pointer", color: "#e8e8e8", fontFamily: F, textAlign: "left",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{s.exercises.length} упр. · {attempts.length} попыт. · {formatDuration(s.duration)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{best}</div>
                      <div style={{ fontSize: 10, color: "#6b7280" }}>лучший</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(10, 15, 10, 0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid #1a2a1a", display: "flex", justifyContent: "space-around",
        paddingTop: 6, paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))", zIndex: 100,
      }}>
        {[{ id: "sessions", label: "Тренировки" }, { id: "stats", label: "Статистика" }, { id: "settings", label: "Настройки" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "4px 20px 6px", cursor: "pointer", WebkitTapHighlightColor: "transparent",
          }}>
            <TabIcon type={t.id} active={tab === t.id} />
            <span style={{ fontSize: 10, fontWeight: 600, fontFamily: F, color: tab === t.id ? "#4ade80" : "#6b7280" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
