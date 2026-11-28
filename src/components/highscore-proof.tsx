"use client";

import { useState } from "react";
import { deleteHighScoreProof, saveHighScoreProof } from "@/lib/client/proof-api";
import { localProofUrl } from "@/lib/client/local-proof";
import { prepareProofImage } from "@/lib/client/proof-image";
import type { ScoreProof } from "@/lib/shared/training-rank";
import { useApp } from "./app-provider";

export function ProofThumb({ proof, onOpen }: { proof: ScoreProof; onOpen: () => void }) {
  const src = useProofSrc(proof);
  return (
    <button
      type="button"
      aria-label="Prikaži dokaz"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-black/40 text-orange-300"
    >
      <CameraIcon />
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => (event.currentTarget.hidden = true)} />}
    </button>
  );
}

export function ProofLightbox({
  proof,
  onClose,
  onChanged,
}: {
  proof: ScoreProof;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const { user, mode, act, refresh } = useApp();
  const src = useProofSrc(proof);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = Boolean(user && (user.role === "admin" || !proof.userId || proof.userId === user.id));

  const replace = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const blob = await prepareProofImage(file);
      const message = await saveHighScoreProof(mode, proof.id, blob, act);
      if (message) setError(message);
      else {
        await refresh();
        await onChanged();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sliku nisam mogao otvoriti.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    const message = await deleteHighScoreProof(mode, proof.id, act);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    await refresh();
    await onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-3" onClick={(event) => event.stopPropagation()}>
        {src ? (
          <img src={src} alt="Dokaz rezultata" className="max-h-[70vh] w-full rounded-2xl object-contain" />
        ) : (
          <p className="rounded-2xl bg-[#141418] px-4 py-8 text-center text-sm text-zinc-300">Slika nije dostupna.</p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          {canEdit && (
            <label className={`flex h-11 items-center justify-center rounded-xl border border-white/15 text-sm font-bold ${busy ? "opacity-50" : ""}`}>
              Zamijeni sliku
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void replace(file);
                }}
              />
            </label>
          )}
          {canEdit && (
            <button type="button" disabled={busy} onClick={() => void remove()} className="h-11 rounded-xl border border-red-500/40 text-sm font-bold text-red-200">
              Obriši dokaz
            </button>
          )}
          <button type="button" onClick={onClose} className={`h-11 rounded-xl bg-orange-500 text-sm font-bold text-black ${canEdit ? "col-span-2" : "col-span-2"}`}>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}

function useProofSrc(proof: ScoreProof): string | null {
  const { mode } = useApp();
  if (mode === "local") return localProofUrl(proof.id);
  return `/api/training/proof/${encodeURIComponent(proof.id)}?v=${proof.rev}`;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
