"use client";
import { useState, useEffect, useCallback } from "react";

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

function ExpenseRow({ expense, rate, onDelete }) {
  const cat = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[8];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.06)",
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
        <div style={{ fontSize: "12px", color: "#6b6b70", marginTop: "2px" }}>
          {formatDate(expense.date)}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: "15px", color: "#f0f0f0" }}>
          €{expense.amount.toFixed(2)}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#6b6b70" }}>
          ₪{(expense.amount * rate).toFixed(2)}
        </div>
      </div>
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

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [rateLoading, setRateLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Load expenses from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("trip_expenses");
      if (saved) setExpenses(JSON.parse(saved));
    } catch {}
  }, []);

  // Save expenses
  useEffect(() => {
    try {
      localStorage.setItem("trip_expenses", JSON.stringify(expenses));
    } catch {}
  }, [expenses]);

  // Fetch live rate
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/EUR"
        );
        const data = await res.json();
        if (data?.rates?.ILS) setRate(data.rates.ILS);
      } catch {
        // keep fallback
      } finally {
        setRateLoading(false);
      }
    }
    fetchRate();
  }, []);

  const addExpense = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    const newExpense = {
      id: Date.now().toString(),
      amount: numAmount,
      description: description.trim(),
      category,
      date,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    setAmount("");
    setDescription("");
    setCategory("other");
    setShowForm(false);
  }, [amount, description, category, date]);

  const deleteExpense = useCallback((id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const totalEur = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIls = totalEur * rate;

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
            <h1
              style={{
                fontFamily: "'Rubik', sans-serif",
                fontWeight: 700,
                fontSize: "22px",
                color: "#f0f0f0",
              }}
            >
              הוצאות טיול ✈️
            </h1>
            <div
              style={{
                fontSize: "11px",
                color: rateLoading ? "#6b6b70" : "#8a8a8e",
                fontFamily: "'DM Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {rateLoading ? (
                <span style={{ animation: "pulse 1s infinite" }}>Loading rate...</span>
              ) : (
                <>
                  <span style={{ color: "#e8c547" }}>€1</span> = ₪{rate.toFixed(4)}
                </>
              )}
            </div>
          </div>

          {/* Totals */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
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
              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: "24px", color: "#e8c547" }}>
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
              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: "24px", color: "#f0f0f0" }}>
                ₪{totalIls.toFixed(2)}
              </div>
            </div>
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

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowForm(false)}
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
                הוסף הוצאה
              </button>
            </div>
          </div>
        )}

        {/* Expense List */}
        <div style={{ padding: "0" }}>
          {expenses.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#6b6b70",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧳</div>
              <div style={{ fontFamily: "'Rubik', sans-serif", fontSize: "15px" }}>
                אין הוצאות עדיין
              </div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>לחץ + כדי להוסיף</div>
            </div>
          ) : (
            expenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} rate={rate} onDelete={deleteExpense} />
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
