"use client";

import React from "react";

// Interactive demo renderers (countdown, questionInput, questionSave)
export default function DemoRendererInteractive({ m, context }: { m: any; context: any }) {
  const meta = (m?.metadata as any) || {};
  if (!meta.demo) return null;

  if (meta.demo === "countdown60" || meta.demo === "countdown") {
    const { now, completedTimers, setCompletedTimers, addMessage, notificationsWebhook, setMessages, messages } = context;
    const raw = meta.startedAt;
    const parsed = typeof raw === "number" ? raw : (typeof raw === "string" ? parseInt(raw, 10) : undefined);
    const startedAt: number | null = Number.isFinite(parsed) ? (parsed as number) : null;
    const total = Math.max(1, Number(meta.seconds ?? (meta.demo === "countdown60" ? 60 : 60)));
    const label: string = String(meta.label || (total === 60 ? "1-minute timer" : `${Math.ceil(total/60)}-minute timer`));
    const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
    const left = startedAt ? Math.max(0, total - elapsed) : total;
    const pct = Math.max(0, Math.min(100, (left / total) * 100));

    if (startedAt && left === 0 && !completedTimers[m.id]) {
      setCompletedTimers((s: any) => ({ ...s, [m.id]: true }));
      const doneId = `m_${Date.now()}_done`;
      addMessage({ id: doneId, role: "assistant", text: `Timer complete: ${label}`, timestamp: Date.now() });
      fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: doneId, role: "assistant", text: `Timer complete: ${label}`, timestamp: Date.now(), echo: false }) }).catch(() => {});

      const nextCfg = meta?.next;
      if (nextCfg && typeof nextCfg === 'object') {
        if (nextCfg.type === 'questionSave') {
          const qId = `m_${Date.now()}_q`;
          const qMeta: any = { demo: 'questionSave', prompt: String(nextCfg.prompt || 'What is on your mind right now?') };
          const ts = Date.now();
          addMessage({ id: qId, role: 'assistant', text: '', metadata: qMeta, timestamp: ts });
          fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: qId, role: 'assistant', text: '', metadata: qMeta, timestamp: ts, echo: false }) }).catch(() => {});
        } else if (nextCfg.type === 'webhookPost') {
          const url = String(notificationsWebhook || '').trim();
          const payload: any = (nextCfg.payload && typeof nextCfg.payload === 'object') ? nextCfg.payload : { text: 'How do you feel about your impulse now?' };
          if (url) {
            try {
              fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
              const ackId2 = `m_${Date.now()}_notify`;
              addMessage({ id: ackId2, role: 'assistant', text: 'Evaluation ping sent.', timestamp: Date.now() });
              fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ackId2, role: 'assistant', text: 'Evaluation ping sent.', timestamp: Date.now(), echo: false }) }).catch(() => {});
            } catch {}
          } else {
            const warnId = `m_${Date.now()}_nowebhook`;
            addMessage({ id: warnId, role: 'assistant', text: 'No notifications webhook configured.', timestamp: Date.now() });
            fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: warnId, role: 'assistant', text: 'No notifications webhook configured.', timestamp: Date.now(), echo: false }) }).catch(() => {});
          }
        }
      }
    }

    return (
      <section aria-label="Countdown" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gray-500/20 text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4a.75.75 0 00-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 101.06-1.06l-2.28-2.28V6z"/></svg>
            </span>
            <div className="text-sm font-medium">{label}</div>
          </div>
          <div className="text-xs text-[var(--fg)]/60">{startedAt ? `${left}s left` : "Not started"}</div>
        </header>
        <div className="p-3">
          <div className="h-2 w-full rounded bg-[var(--surface-2)]/40 overflow-hidden">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%`, transition: "width 300ms linear" }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            {!startedAt ? (
              <button
                type="button"
                className="px-2 py-1 rounded-md border border-[var(--border)] bg-gray-700 text-white hover:bg-gray-600"
                onClick={async () => {
                  const ts = Date.now();
                  const originalNext = (meta as any)?.next;
                  const newMeta: any = { demo: "countdown", seconds: total, startedAt: ts, label };
                  if (originalNext && typeof originalNext === 'object') newMeta.next = originalNext;
                  context.setMessages(context.messages.map((mm: any) => (mm.id === m.id ? { ...mm, metadata: newMeta } : mm)));
                  try {
                    await fetch("/api/messages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, metadata: newMeta }) });
                  } catch {}
                }}
              >
                Start
              </button>
            ) : left === 0 ? (
              <div className="inline-flex items-center gap-1 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.3 6.25-2.292-2.276a1 1 0 00-1.416 1.414l3 2.98a1 1 0 001.408 0l7.008-6.95z" clipRule="evenodd"/></svg>
                Completed
              </div>
            ) : (
              <div className="text-[var(--fg)]/60">Running…</div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (meta.demo === "questionInput") {
    const { questionInputs, setQuestionInputs, addMessage, setToast } = context;
    const val = questionInputs[m.id] ?? "";
    return (
      <section aria-label="Question" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
        <header className="px-3 py-2 border-b border-[var(--border)] text-sm font-medium">Ask a question</header>
        <div className="p-3 flex items-center gap-2">
          <input
            value={val}
            onChange={(e) => setQuestionInputs((s: any) => ({ ...s, [m.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const text = (questionInputs[m.id] ?? "").trim();
                if (!text) return;
                const ts = Date.now();
                const id = `m_${ts}`;
                addMessage({ id, role: "user", text, timestamp: ts });
                // Persist the question to Neon so it survives refresh
                try {
                  fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, role: "user", text, timestamp: ts, echo: false }),
                  }).catch(() => {});
                } catch {}
                setQuestionInputs((s: any) => ({ ...s, [m.id]: "" }));
                setToast("Message sent.");
                window.setTimeout(() => setToast(null), 1500);
              }
            }}
            className="flex-1 border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--surface-1)] text-[var(--fg)] placeholder-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Type your question and press Enter"
            aria-label="Question"
          />
          <button
            type="button"
            onClick={() => {
              const text = (questionInputs[m.id] ?? "").trim();
              if (!text) return;
              const ts = Date.now();
              const id = `m_${ts}`;
              addMessage({ id, role: "user", text, timestamp: ts });
              // Persist the question to Neon so it survives refresh
              try {
                fetch("/api/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, role: "user", text, timestamp: ts, echo: false }),
                }).catch(() => {});
              } catch {}
              setQuestionInputs((s: any) => ({ ...s, [m.id]: "" }));
              setToast("Message sent.");
              window.setTimeout(() => setToast(null), 1500);
            }}
            className="px-3 py-2 rounded-md border border-[var(--border)] bg-gray-700 text-white hover:bg-gray-600 text-sm"
          >
            Send
          </button>
        </div>
      </section>
    );
  }

  if (meta.demo === "questionSave") {
    const { questionInputs, setQuestionInputs, saveStates, setSaveStates, addMessage, messages, setToast, showGoodnightCard } = context;
    const val = questionInputs[m.id] ?? "";
    const prompt: string = String(meta.prompt || "What is on your mind right now?");
    // Derive persisted saved state from message so it survives refresh
    const persistedSaved = m?.saved === true || (typeof (m?.metadata as any)?.saved === 'boolean' && (m?.metadata as any)?.saved === true);
    const st = saveStates[m.id] ?? (persistedSaved ? "saved" : "idle");
    return (
      <section aria-label="Question Save" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
        <header className="px-3 py-2 border-b border-[var(--border)] text-sm font-medium">{prompt}</header>
        {st !== "saved" ? (
          <div className="p-3 flex items-center gap-2">
            <input
              value={val}
              onChange={(e) => setQuestionInputs((s: any) => ({ ...s, [m.id]: e.target.value }))}
              onKeyDown={(e) => { e.stopPropagation(); }}
              className="flex-1 border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--surface-1)] text-[var(--fg)] placeholder-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Type your answer"
              aria-label="Mind snapshot answer"
            />
            <button
              type="button"
              onClick={async () => {
                const text = (questionInputs[m.id] ?? "").trim();
                if (!text) return;
                try {
                  setSaveStates((s: any) => ({ ...s, [m.id]: "saving" }));
                  let saveTo: string = String((meta as any).saveTo || "/api/mind");
                  if (!('saveTo' in (meta as any)) && (meta as any).sessionId) {
                    saveTo = "/api/winddown/answer";
                  }
                  const payload: any = { id: `mind_${Date.now()}`, text, createdAt: Date.now() };
                  if ((meta as any).sessionId) payload.sessionId = (meta as any).sessionId;
                  if ((meta as any).question) payload.question = (meta as any).question;
                  const res = await fetch(saveTo, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  const data = await res.json().catch(() => ({} as any));
                  if (!data?.ok) throw new Error(data?.error || "Save failed");
                  setSaveStates((s: any) => ({ ...s, [m.id]: "saved" }));
                  setToast("Saved.");
                  // Update local message to reflect saved immediately
                  try {
                    context.setMessages((context.messages || []).map((mm: any) => mm.id === m.id ? { ...mm, saved: true, metadata: { ...(mm.metadata||{}), saved: true } } : mm));
                  } catch {}
                  // Mark this question card as saved in Neon so UI reflects after refresh
                  try {
                    await fetch('/api/messages', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: m.id, saved: true }),
                    });
                  } catch {}

                  if (data?.message && typeof data.message === 'object') {
                    const gen = data.message;
                    const exists = (messages || []).some((mm: any) => mm.id === gen.id);
                    if (!exists) {
                      addMessage(gen);
                      try {
                        await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...gen, echo: false }) });
                      } catch {}
                    }
                  }

                  if (data?.goodnight === true) {
                    if (data?.message && data.message?.metadata?.demo === 'goodnightCard') {
                      const existsAny = (messages || []).some((mm: any) => mm?.metadata?.demo === 'goodnightCard');
                      if (!existsAny) {
                        const existsSameId = (messages || []).some((mm: any) => mm.id === data.message.id);
                        if (!existsSameId) {
                          addMessage(data.message);
                        }
                      }
                      context.goodnightLockRef.current = true;
                      context.setGoodnightShown(true);
                      try { context.bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
                    } else {
                      showGoodnightCard();
                    }
                    return;
                  }

                  const next = (meta as any)?.next;
                  if (next && typeof next === 'object' && next.type === 'questionSave') {
                    const qId = `m_${Date.now()}_q`;
                    let inheritedSaveTo = String(next.saveTo || saveTo);
                    if (!('saveTo' in next) && ((meta as any).sessionId || next.sessionId)) {
                      inheritedSaveTo = "/api/winddown/answer";
                    }
                    const nextMeta: any = { demo: 'questionSave', prompt: String(next.prompt || ''), saveTo: inheritedSaveTo };
                    if ((meta as any).sessionId) nextMeta.sessionId = (meta as any).sessionId;
                    if (next.sessionId) nextMeta.sessionId = next.sessionId;
                    if (next.question) nextMeta.question = next.question;
                    if (next.next) nextMeta.next = next.next;
                    const qTs = Date.now();
                    addMessage({ id: qId, role: 'assistant', text: '', metadata: nextMeta, timestamp: qTs });
                    fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: qId, role: 'assistant', text: '', metadata: nextMeta, timestamp: qTs, echo: false }) }).catch(() => {});
                  } else if (next && typeof next === 'object' && next.type === 'winddownIntro') {
                    try {
                      const res = await fetch('/api/rituals/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ritualId: 'winddown' }) });
                      const data2 = await res.json().catch(() => ({} as any));
                      const list = Array.isArray(data2?.messages) ? data2.messages : [];
                      for (const mm of list) {
                        addMessage(mm);
                        fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...mm, echo: false }) }).catch(() => {});
                      }
                    } catch {}
                  } else if (next && typeof next === 'object' && next.type === 'goodnight') {
                    showGoodnightCard();
                  } else if ((meta as any)?.question === 'one_thing_learned' || String((meta as any)?.prompt || '').toLowerCase().includes("one thing you have learned")) {
                    window.setTimeout(() => { showGoodnightCard(); }, 50);
                  }
                } catch (e) {
                  setSaveStates((s: any) => ({ ...s, [m.id]: "error" }));
                  setToast("Save failed.");
                } finally {
                  setQuestionInputs((s: any) => ({ ...s, [m.id]: "" }));
                  window.setTimeout(() => setToast(null), 1600);
                }
              }}
              disabled={st === "saving"}
              className={"px-3 py-2 rounded-md border text-sm border-[var(--border)] bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 disabled:opacity-60"}
            >
              {st === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        ) : null}
        {st === "saved" ? (
          <div className="px-3 pb-3 text-xs text-emerald-400 inline-flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.3 6.25-2.292-2.276a1 1 0 00-1.416 1.414l3 2.98a1 1 0 001.408 0l7.008-6.95z" clipRule="evenodd"/></svg>
            Saved
          </div>
        ) : st === "error" ? (
          <div className="px-3 pb-3 text-xs text-red-400">Save failed. Please try again.</div>
        ) : null}
      </section>
    );
  }

  return null;
}
