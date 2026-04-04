"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const FALLBACK_RATE = 3.65;

const CATEGORIES = [
  { id: "flight", label: "טיסה", emoji: "✈️" },
  { id: "taxi", label: "מונית", emoji: "🚕" },
  { id: "hotel", label: "מלון", emoji: "🏨" },
  { id: "dinner", label: "ארוחת ערב", emoji: "🍽️" },
  { id: "lunch", label: "צהריים", emoji: "🥗" },
  { id: "breakfast", label: "ארוחת בוקר", emoji: "🍳" },
  { id: "water", label: "מים", emoji: "💧" },
  { id: "transport", label: "תחבורה", emoji: "🚌" },
  { id: "shopping", label: "קניות", emoji: "🛍️" },
  { id: "other", label: "אחר", emoji: "📝" },
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function QuickCategory({ cat, selected, onSelect }) {
  const isActive = selected === cat.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(cat.id)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        padding: "8px 6px",
        borderRadius: "12px",
        border: isActive ? "2px solid #e8c547" : "2px solid transparent",
        background: isActive ? "rgba(232,197,71,0.12)" : "rgba(255,255,255,0.04)",
        color: isActive ? "#e8c547" : "#8a8a8e",
        fontSize: "11px",
        cursor: "pointer",
        minWidth: "56px",
        transition: "all 0.15s ease",
      }}
    >
      <span style={{ fontSize: "20px" }}>{cat.emoji}</span>
      <span style={{ fontFamily: "'Rubik', sans-serif", fontWeight: isActive ? 600 : 400 }}>
        {cat.label}
      </span>
    </button>
  );
}

function ExpenseRow({ expense, rate, onDelete, onEdit }) {
  const cat = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const payBack = expense.paidByOther ? (expense.myShare ?? expense.amount) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: expense.paidByOther ? "rgba(100,160,255,0.04)" : "transparent",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: expense.paidByOther ? "rgba(100,160,255,0.12)" : "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          flexShrink: 0,
        }}
      >
        {cat.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Rubik', sans-serif",
            fontWeight: 500,
            fontSize: "15px",
            color: "#f0f0f0",
            direction: "rtl",
          }}
        >
          {expense.description || cat.label}
        </div>
        <div style={{ fontSize: "12px", color: "#6b6b70", marginTop: "2px", display: "flex", gap: "6px", alignItems: "center" }}>
          {formatDate(expense.date)}
          {expense.paidByOther && (
            <span style={{ color: "#64a0ff", fontFamily: "'DM Mono', monospace" }}>
              ↩ להחזיר {expense.paidByName ? `ל${expense.paidByName} ` : ""} €{payBack.toFixed(2)} 
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: "15px", color: expense.paidByOther ? "#8a8a8e" : "#f0f0f0" }}>
          €{expense.amount.toFixed(2)}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#6b6b70" }}>
          ₪{(expense.amount * rate).toFixed(2)}
        </div>
      </div>
      <button
        onClick={() => onEdit(expense)}
        style={{
          background: "none",
          border: "none",
          color: "#6b6b70",
          fontSize: "14px",
          cursor: "pointer",
          padding: "4px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Edit"
      >
        ✎
      </button>
      <button
        onClick={() => onDelete(expense.id)}
        style={{
          background: "none",
          border: "none",
          color: "#6b6b70",
          fontSize: "16px",
          cursor: "pointer",
          padding: "4px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Delete"
      >
        ×
      </button>
    </div>
  );
}

// Sync status: "idle" | "saving" | "saved" | "error" | "loading"
function SyncBadge({ status, binId, onImport }) {
  const [showImport, setShowImport] = useState(false);
  const [importId, setImportId] = useState("");

  const label = {
    idle: "☁️ מסונכרן",
    saving: "⏳ שומר...",
    saved: "✓ נשמר",
    error: "⚠️ שגיאה",
    loading: "⏳ טוען...",
    offline: "💾 מקומי",
  }[status] || "☁️";

  const color = {
    idle: "#6b6b70",
    saving: "#e8c547",
    saved: "#4caf82",
    error: "#e85447",
    loading: "#e8c547",
    offline: "#6b6b70",
  }[status] || "#6b6b70";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowImport((v) => !v)}
        style={{
          background: "none",
          border: "none",
          color,
          fontSize: "11px",
          fontFamily: "'DM Mono', monospace",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.05)",
        }}
      >
        {label}
      </button>

      {showImport && (
        <div
          style={{
            position: "absolute",
            top: "36px",
            right: 0,
            background: "#1a1a1e",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "12px",
            padding: "14px",
            width: "260px",
            zIndex: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {binId && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "#6b6b70", marginBottom: "6px" }}>
                שתף קישור זה עם מכשיר אחר:
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  color: "#e8c547",
                  background: "rgba(232,197,71,0.08)",
                  borderRadius: "8px",
                  padding: "8px",
                  wordBreak: "break-all",
                  cursor: "pointer",
                }}
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?sync=${binId}`;
                  navigator.clipboard?.writeText(url);
                }}
                title="לחץ להעתקה"
              >
                {typeof window !== "undefined"
                  ? `${window.location.origin}${window.location.pathname}?sync=${binId}`
                  : `?sync=${binId}`}
              </div>
              <div style={{ fontSize: "10px", color: "#6b6b70", marginTop: "4px" }}>
                לחץ להעתקת הקישור
              </div>
            </div>
          )}

          <div style={{ fontSize: "11px", color: "#6b6b70", marginBottom: "6px" }}>
            {binId ? "או טען מזהה קיים:" : "הכנס מזהה סנכרון:"}
          </div>
          <input
            type="text"
            placeholder="הדבק מזהה כאן..."
            value={importId}
            onChange={(e) => setImportId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.3)",
              color: "#f0f0f0",
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              outline: "none",
              marginBottom: "8px",
              boxSizing: "border-box",
              direction: "ltr",
            }}
          />
          <button
            onClick={() => {
              if (importId.trim()) {
                onImport(importId.trim());
                setShowImport(false);
                setImportId("");
              }
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: importId.trim() ? "#e8c547" : "rgba(232,197,71,0.2)",
              color: importId.trim() ? "#0a0a0c" : "#6b6b70",
              fontFamily: "'Rubik', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              cursor: importId.trim() ? "pointer" : "default",
            }}
          >
            טען נתונים
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [rateLoading, setRateLoading] = useState(true);
  const [paidByOther, setPaidByOther] = useState(false);
  const [paidByName, setPaidByName] = useState("");
  const [myShare, setMyShare] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [syncId, setSyncId] = useState(null);
  const [syncStatus, setSyncStatus] = useState("offline");
  const saveTimer = useRef(null);
  const initialized = useRef(false);

  // Load from localStorage + cloud on mount
  useEffect(() => {
    async function init() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSyncId = urlParams.get("sync");
      const savedSyncId = urlSyncId || localStorage.getItem("trip_sync_id");
      const localExpenses = localStorage.getItem("trip_expenses");

      if (savedSyncId) {
        setSyncId(savedSyncId);
        localStorage.setItem("trip_sync_id", savedSyncId);
        window.history.replaceState({}, "", `?sync=${savedSyncId}`);
        setSyncStatus("loading");
        try {
          const res = await fetch(`/api/sync?syncId=${savedSyncId}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.expenses)) {
              setExpenses(data.expenses);
              localStorage.setItem("trip_expenses", JSON.stringify(data.expenses));
            }
            setSyncStatus("idle");
          } else {
            if (localExpenses) setExpenses(JSON.parse(localExpenses));
            setSyncStatus("error");
          }
        } catch {
          if (localExpenses) {
            try { setExpenses(JSON.parse(localExpenses)); } catch {}
          }
          setSyncStatus("error");
        }
      } else {
        if (localExpenses) {
          try { setExpenses(JSON.parse(localExpenses)); } catch {}
        }
        setSyncStatus("offline");
      }
      initialized.current = true;
    }
    init();
  }, []);

  // Auto-save to cloud whenever expenses change (debounced 1.5s)
  useEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem("trip_expenses", JSON.stringify(expenses));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const currentSyncId = localStorage.getItem("trip_sync_id");
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syncId: currentSyncId || null, expenses }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.syncId && data.syncId !== currentSyncId) {
            setSyncId(data.syncId);
            localStorage.setItem("trip_sync_id", data.syncId);
            window.history.replaceState({}, "", `?sync=${data.syncId}`);
          }
          setSyncStatus("saved");
          setTimeout(() => setSyncStatus("idle"), 2000);
        } else {
          setSyncStatus("error");
        }
      } catch {
        setSyncStatus("error");
      }
    }, 1500);
  }, [expenses]);

  // Import by sync ID
  const handleImport = useCallback(async (id) => {
    setSyncStatus("loading");
    try {
      const res = await fetch(`/api/sync?syncId=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.expenses)) {
          setExpenses(data.expenses);
          localStorage.setItem("trip_expenses", JSON.stringify(data.expenses));
          setSyncId(id);
          localStorage.setItem("trip_sync_id", id);
          setSyncStatus("idle");
        }
      } else {
        setSyncStatus("error");
        alert("לא נמצא מזהה סנכרון");
      }
    } catch {
      setSyncStatus("error");
    }
  }, []);

  // Fetch live rate
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
        const data = await res.json();
        if (data?.rates?.ILS) setRate(data.rates.ILS);
      } catch {}
      finally { setRateLoading(false); }
    }
    fetchRate();
  }, []);

  const handleEdit = useCallback((expense) => {
    setEditingId(expense.id);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setCategory(expense.category);
    setDate(expense.date);
    setPaidByOther(expense.paidByOther || false);
    setPaidByName(expense.paidByName || "");
    setMyShare(expense.myShare != null ? expense.myShare.toString() : "");
    setShowForm(true);
  }, []);

  const addExpense = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    const numMyShare = paidByOther && myShare !== "" ? parseFloat(myShare) : null;
    if (editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, amount: numAmount, description: description.trim(), category, date, paidByOther, paidByName: paidByOther ? paidByName.trim() : "", myShare: numMyShare }
            : e
        )
      );
      setEditingId(null);
    } else {
      const newExpense = {
        id: Date.now().toString(),
        amount: numAmount,
        description: description.trim(),
        category,
        date,
        paidByOther,
        paidByName: paidByOther ? paidByName.trim() : "",
        myShare: numMyShare,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
    setAmount("");
    setDescription("");
    setCategory("other");
    setPaidByOther(false);
    setPaidByName("");
    setMyShare("");
    setShowForm(false);
  }, [amount, description, category, date, editingId, paidByOther, myShare]);

  const deleteExpense = useCallback((id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const exportXlsx = useCallback(() => {
    const rows = expenses.map((e) => {
      const cat = CATEGORIES.find((c) => c.id === e.category) || CATEGORIES[CATEGORIES.length - 1];
      return {
        תאריך: e.date,
        קטגוריה: cat.label,
        תיאור: e.description || "",
        "סכום (€)": e.amount,
        "סכום (₪)": parseFloat((e.amount * rate).toFixed(2)),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "הוצאות");
    XLSX.writeFile(wb, "הוצאות-טיול.xlsx");
  }, [expenses, rate]);

  const totalEur = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIls = totalEur * rate;
  const payBackEur = expenses
    .filter((e) => e.paidByOther)
    .reduce((sum, e) => sum + (e.myShare ?? e.amount), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Rubik:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 16px; }
        body {
          background: #0a0a0c;
          color: #f0f0f0;
          font-family: 'Rubik', -apple-system, sans-serif;
          min-height: 100dvh;
          -webkit-font-smoothing: antialiased;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type="number"] { -moz-appearance: textfield; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100dvh", position: "relative" }}>
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 24px",
            background: "linear-gradient(180deg, rgba(232,197,71,0.08) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: "22px", color: "#f0f0f0" }}>
                הוצאות טיול ✈️
              </h1>
              {expenses.length > 0 && (
                <button
                  onClick={exportXlsx}
                  title="ייצא ל-Excel"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#8a8a8e",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "5px 10px",
                    fontFamily: "'Rubik', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  ↓ Excel
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: rateLoading ? "#6b6b70" : "#8a8a8e",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {rateLoading ? (
                  <span style={{ animation: "pulse 1s infinite" }}>...</span>
                ) : (
                  <>
                    <span style={{ color: "#e8c547" }}>€1</span> = ₪{rate.toFixed(4)}
                  </>
                )}
              </div>
              <SyncBadge status={syncStatus} binId={syncId} onImport={handleImport} />
            </div>
          </div>

          {/* Totals */}
          <div style={{ display: "grid", gridTemplateColumns: payBackEur > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap: "12px" }}>
            <div
              style={{
                background: "rgba(232,197,71,0.08)",
                border: "1px solid rgba(232,197,71,0.15)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#8a8a8e", marginBottom: "4px", letterSpacing: "0.5px" }}>
                TOTAL EUR
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: payBackEur > 0 ? "18px" : "24px", color: "#e8c547" }}>
                €{totalEur.toFixed(2)}
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#8a8a8e", marginBottom: "4px", letterSpacing: "0.5px" }}>
                TOTAL ILS
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: payBackEur > 0 ? "18px" : "24px", color: "#f0f0f0" }}>
                ₪{totalIls.toFixed(0)}
              </div>
            </div>
            {payBackEur > 0 && (
              <div
                style={{
                  background: "rgba(100,160,255,0.08)",
                  border: "1px solid rgba(100,160,255,0.2)",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#8a8a8e", marginBottom: "4px", letterSpacing: "0.5px" }}>
                  להחזיר
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: "18px", color: "#64a0ff" }}>
                  €{payBackEur.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <div
            className="fade-in"
            style={{
              padding: "20px",
              margin: "0 16px 8px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
            }}
          >
            {/* Category Quick Select */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <QuickCategory key={cat.id} cat={cat} selected={category} onSelect={setCategory} />
                ))}
              </div>
            </div>

            {/* Amount + Description */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <div style={{ position: "relative", flex: "0 0 120px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#e8c547",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "16px",
                    fontWeight: 500,
                  }}
                >
                  €
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 12px 14px 30px",
                    borderRadius: "10px",
                    border: "1px solid rgba(232,197,71,0.25)",
                    background: "rgba(0,0,0,0.3)",
                    color: "#f0f0f0",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "16px",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>
              <input
                type="text"
                placeholder="תיאור (אופציונלי)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  flex: 1,
                  padding: "14px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#f0f0f0",
                  fontFamily: "'Rubik', sans-serif",
                  fontSize: "14px",
                  outline: "none",
                  direction: "rtl",
                }}
              />
            </div>

            {/* Date */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#f0f0f0",
                  fontFamily: "'Rubik', sans-serif",
                  fontSize: "14px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* Live preview */}
            {amount && parseFloat(amount) > 0 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#6b6b70",
                  marginBottom: "12px",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                €{parseFloat(amount).toFixed(2)} = ₪{(parseFloat(amount) * rate).toFixed(2)}
              </div>
            )}

            {/* Paid by other */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setPaidByOther((v) => !v); setMyShare(""); setPaidByName(""); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: paidByOther ? "rgba(100,160,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: paidByOther ? "1px solid rgba(100,160,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    color: paidByOther ? "#64a0ff" : "#8a8a8e",
                    fontFamily: "'Rubik', sans-serif",
                    fontSize: "14px",
                    fontWeight: paidByOther ? 600 : 400,
                    cursor: "pointer",
                    padding: "10px 14px",
                    flex: 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>↩</span>
                  מישהו אחר שילם
                  <span style={{ marginRight: "auto", fontSize: "16px" }}>{paidByOther ? "✓" : ""}</span>
                </button>
                {paidByOther && (
                  <input
                    type="text"
                    placeholder="שם..."
                    value={paidByName}
                    onChange={(e) => setPaidByName(e.target.value)}
                    style={{
                      width: "110px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(100,160,255,0.25)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#f0f0f0",
                      fontFamily: "'Rubik', sans-serif",
                      fontSize: "14px",
                      outline: "none",
                      direction: "rtl",
                    }}
                  />
                )}
              </div>

              {paidByOther && (
                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#8a8a8e", fontFamily: "'Rubik', sans-serif", whiteSpace: "nowrap" }}>
                    כמה להחזיר?
                  </span>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64a0ff", fontFamily: "'DM Mono', monospace", fontSize: "15px" }}>€</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={amount || "0.00"}
                      value={myShare}
                      onChange={(e) => setMyShare(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 28px",
                        borderRadius: "10px",
                        border: "1px solid rgba(100,160,255,0.25)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#f0f0f0",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "15px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", color: "#6b6b70", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                    {myShare === "" && amount ? `= €${parseFloat(amount || 0).toFixed(2)}` : myShare ? `₪${(parseFloat(myShare) * rate).toFixed(0)}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setAmount(""); setDescription(""); setCategory("other"); setPaidByOther(false); setPaidByName(""); setMyShare(""); }}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#8a8a8e",
                  fontFamily: "'Rubik', sans-serif",
                  fontSize: "15px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                ביטול
              </button>
              <button
                onClick={addExpense}
                style={{
                  flex: 2,
                  padding: "14px",
                  borderRadius: "10px",
                  border: "none",
                  background: parseFloat(amount) > 0 ? "#e8c547" : "rgba(232,197,71,0.3)",
                  color: parseFloat(amount) > 0 ? "#0a0a0c" : "#6b6b70",
                  fontFamily: "'Rubik', sans-serif",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: parseFloat(amount) > 0 ? "pointer" : "default",
                }}
              >
                {editingId ? "עדכן הוצאה" : "הוסף הוצאה"}
              </button>
            </div>
          </div>
        )}

        {/* Expense List */}
        <div style={{ padding: "0" }}>
          {expenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b6b70" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧳</div>
              <div style={{ fontFamily: "'Rubik', sans-serif", fontSize: "15px" }}>
                אין הוצאות עדיין
              </div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>לחץ + כדי להוסיף</div>
            </div>
          ) : (
            expenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} rate={rate} onDelete={deleteExpense} onEdit={handleEdit} />
            ))
          )}
        </div>

        {/* Floating Add Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              position: "fixed",
              bottom: "24px",
              right: "50%",
              transform: "translateX(50%)",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              border: "none",
              background: "#e8c547",
              color: "#0a0a0c",
              fontSize: "28px",
              fontWeight: 300,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(232,197,71,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            +
          </button>
        )}

        {/* Bottom Spacer */}
        <div style={{ height: "100px" }} />
      </div>
    </>
  );
}
