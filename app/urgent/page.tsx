// app/urgent/page.tsx
// Purpose: Urgent todos page with configurable items. Wires to Zustand store and persists in localStorage.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import UrgentTodoForm from "@/components/UrgentTodoForm";
import UrgentTodoList from "@/components/UrgentTodoList";
import { useAppStore } from "@/lib/store";
import Logo from "@/images/logo/logo.png";

export default function UrgentPage() {
  const { addUrgentTodo, loadUrgentTodos } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    loadUrgentTodos();
  }, [loadUrgentTodos]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar identical to Chat/Schedule header */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--border)] rounded-t-lg">
            <div className="flex items-center gap-2">
              <Image
                src={Logo}
                alt="Eeko logo"
                width={22}
                height={22}
                className="opacity-90 [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                priority
              />
              <span className="text-sm font-medium text-[var(--fg)]/85">Eeko</span>
              <span className="text-[10px] font-normal text-[var(--fg)]/35">v.03</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Add and Edit buttons */}
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="hidden md:inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
              >
                Add urgent
              </button>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="hidden md:inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
              >
                {editing ? "Done" : "Edit"}
              </button>
              {/* Mobile-only hamburger */}
              <div className="md:hidden">
                <Sidebar variant="top" />
              </div>
            </div>
          </div>

          {/* Page body */}
          <div className="flex-1 min-h-0 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-[var(--fg)]">Urgent</h1>
                <p className="text-sm text-[var(--fg)]/60">Fast inbox for critical tasks. Stored locally on this device.</p>
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                >
                  Add urgent
                </button>
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                >
                  {editing ? "Done" : "Edit"}
                </button>
              </div>
            </div>

            <UrgentTodoList editing={editing} />
          </div>

          {/* Add urgent modal */}
          {showAdd ? (
            <div className="fixed inset-0 z-20 flex items-end sm:items-center sm:justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
              <div className="relative w-full sm:w-[520px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--fg)]">Add Urgent Task</h3>
                  <button type="button" className="text-[var(--fg)]/70 text-sm hover:text-[var(--fg)]" onClick={() => setShowAdd(false)} aria-label="Close">✕</button>
                </div>
                <div className="p-4">
                  <UrgentTodoForm
                    onAdd={(t) => {
                      addUrgentTodo(t);
                      setShowAdd(false);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

