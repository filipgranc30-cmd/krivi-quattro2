"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { TrainingNav } from "@/components/training-nav";
import { Card, GhostButton, SectionTitle } from "@/components/ui";
import { addDays, formatDateHr, mondayOf, todayZagreb, weekdayName } from "@/lib/shared/dates";
import type { AttendanceStatus } from "@/lib/shared/types";

export default function TrainingAttendancePage() {
  const { data, user, act } = useApp();
  const [week, setWeek] = useState(() => mondayOf(todayZagreb()));
  const [pending, setPending] = useState("");
  const days = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const today = todayZagreb();

  const setStatus = async (date: string, status: AttendanceStatus, current?: AttendanceStatus) => {
    setPending(date + status);
    if (current === status) {
      await act({ op: "clearAttendance", kind: "training", targetId: date });
    } else {
      const time = data.settings.trainingTime || "18:00";
      await act({
        op: "attendance",
        kind: "training",
        targetId: date,
        status,
        label: `${weekdayName(date).toLowerCase()} ${formatDateHr(date)} u ${time}`,
      });
    }
    setPending("");
  };

  return (
    <div className="space-y-4">
      <TrainingNav current="dolasci" />
      <div>
        <SectionTitle>DOLAZAK NA TRENING</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Tko dolazi i tko ne dolazi. Imena vidi cijela ekipa.</p>
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <GhostButton onClick={() => setWeek(addDays(week, -7))}>←</GhostButton>
          <div className="text-center text-sm">
            {formatDateHr(days[0])} – {formatDateHr(days[6])}
          </div>
          <GhostButton onClick={() => setWeek(addDays(week, 7))}>→</GhostButton>
        </div>
        <div className="mt-3 space-y-3">
          {days.map((date) => {
            const rows = data.attendance.filter((item) => item.kind === "training" && item.targetId === date);
            const mine = rows.find((item) => item.userId === user?.id)?.status;
            const coming = rows.filter((item) => item.status === "dolazim");
            const absent = rows.filter((item) => item.status === "ne_dolazim");
            return (
              <div key={date} className={`rounded-xl border p-3 ${date === today ? "border-orange-500" : "border-white/10"}`}>
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-lg">{weekdayName(date)}</div>
                  <div className="text-xs text-zinc-400">{formatDateHr(date)} · {data.settings.trainingTime}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">Dolazi: {coming.map((item) => item.userName).join(", ") || "nitko"}</div>
                <div className="mt-1 text-xs text-red-300">Ne dolazi: {absent.map((item) => item.userName).join(", ") || "nitko"}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={pending !== ""} onClick={() => setStatus(date, "dolazim", mine)} className={`h-11 rounded-xl text-sm font-bold ${mine === "dolazim" ? "bg-orange-500 text-black" : "border border-orange-500/40"}`}>Dolazim</button>
                  <button type="button" disabled={pending !== ""} onClick={() => setStatus(date, "ne_dolazim", mine)} className={`h-11 rounded-xl text-sm font-bold ${mine === "ne_dolazim" ? "bg-red-500" : "border border-white/15"}`}>Ne dolazim</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
