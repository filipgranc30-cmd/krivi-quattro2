"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LaunchSplash } from "@/components/launch-splash";
import { localData, localLogin, localLogout, localMutate, localRegister, localReset, localSessionUser } from "@/lib/client/local-db";
import { toPublic } from "@/lib/shared/mutate";
import { emptyDb } from "@/lib/shared/seed";
import type { Action, AppData, Snapshot, UserPublic } from "@/lib/shared/types";
import { Shell } from "./shell";

type Status = { mode: "shared" | "local"; push: boolean; vapidPublicKey: string | null; adminEmail: string | null };

type AppContextValue = {
  ready: boolean;
  mode: "shared" | "local";
  user: UserPublic | null;
  data: AppData;
  snapshot: Snapshot | null;
  snapshotError: string | null;
  pushEnabled: boolean;
  vapidPublicKey: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  act: (action: Action) => Promise<string | null>;
  refresh: () => Promise<void>;
  enablePush: () => Promise<string | null>;
  resetLocal: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const emptyData = toPublic(emptyDb(), null);

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>({ mode: "local", push: false, vapidPublicKey: null, adminEmail: null });
  const [user, setUser] = useState<UserPublic | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    const response = await fetch("/api/psgz/snapshot", { cache: "no-store" });
    const body = await readJson(response);
    if (body.ok && body.snapshot) {
      setSnapshot(body.snapshot as Snapshot);
      setSnapshotError(null);
    } else {
      setSnapshot(null);
      setSnapshotError(typeof body.error === "string" ? body.error : "PSGZ nije dostupan.");
    }
  }, []);

  const loadShared = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store", credentials: "include" });
    if (response.status === 401) {
      setUser(null);
      setData(emptyData);
      return;
    }
    const body = await readJson(response);
    if (body.pending && body.user) {
      setUser(body.user as UserPublic);
      setData(emptyData);
      return;
    }
    if (body.ok && body.user && body.data) {
      setUser(body.user as UserPublic);
      setData(body.data as AppData);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        const body = (await response.json()) as Status;
        if (cancelled) return;
        const nextStatus: Status = {
          mode: body.mode === "shared" ? "shared" : "local",
          push: Boolean(body.push),
          vapidPublicKey: body.vapidPublicKey ?? null,
          adminEmail: typeof body.adminEmail === "string" ? body.adminEmail : null,
        };
        setStatus(nextStatus);
        if (nextStatus.mode === "shared") await loadShared();
        else {
          const session = localSessionUser();
          setUser(session);
          setData(localData(session));
        }
        await loadSnapshot();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [loadShared, loadSnapshot]);

  const refresh = useCallback(async () => {
    if (status.mode === "shared") await loadShared();
    else if (user) {
      const session = localSessionUser();
      if (!session) {
        setUser(null);
        setData(emptyData);
      } else {
        setUser(session);
        setData(session.status === "pending" ? emptyData : localData(session));
      }
    }
    if (user?.status === "pending") return;
    await loadSnapshot();
  }, [loadShared, loadSnapshot, status.mode, user]);

  useEffect(() => {
    if (!ready || !user) return;
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 15000);
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      refresh().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [ready, refresh, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (status.mode === "local") {
        const result = await localLogin(email, password);
        if ("error" in result) return result.error;
        setUser(result.user);
        setData(result.user.status === "pending" ? emptyData : localData(result.user));
        return null;
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await readJson(response);
      if (!response.ok) return typeof body.error === "string" ? body.error : "Prijava nije uspjela.";
      await loadShared();
      return null;
    },
    [loadShared, status.mode],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (status.mode === "local") {
        const result = await localRegister(name, email, password, status.adminEmail);
        if ("error" in result) return result.error;
        setUser(result.user);
        setData(result.user.status === "pending" ? emptyData : localData(result.user));
        return null;
      }
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await readJson(response);
      if (!response.ok) return typeof body.error === "string" ? body.error : "Registracija nije uspjela.";
      await loadShared();
      return null;
    },
    [loadShared, status.adminEmail, status.mode],
  );

  const logout = useCallback(async () => {
    if (status.mode === "shared") {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } else localLogout();
    setUser(null);
    setData(emptyData);
  }, [status.mode]);

  const act = useCallback(
    async (action: Action) => {
      if (!user) return "Nisi prijavljen.";
      const preview = previewAttendance(data, user, action);
      if (preview) setData(preview);
      if (status.mode === "local") {
        const result = localMutate(user, action);
        const session = localSessionUser();
        setUser(session);
        setData(result.data);
        return result.error ?? null;
      }
      try {
        const response = await fetch("/api/mutate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const body = await readJson(response);
        if (!response.ok) {
          await loadShared();
          return typeof body.error === "string" ? body.error : "Spremanje nije uspjelo.";
        }
        if (body.user) setUser(body.user as UserPublic);
        if (body.data) setData(body.data as AppData);
        return null;
      } catch {
        await loadShared();
        return "Spremanje nije uspjelo.";
      }
    },
    [data, loadShared, status.mode, user],
  );

  const enablePush = useCallback(async () => {
    if (!status.vapidPublicKey || status.mode !== "shared") {
      return "Web push još nije uključen. Admin treba dodati VAPID ključeve u Vercel.";
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "Ovaj preglednik ne podržava obavijesti.";
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "Dozvola za obavijesti nije dana.";
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(status.vapidPublicKey),
    });
    const json = subscription.toJSON();
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
    if (!response.ok) return "Pretplata nije spremljena.";
    return null;
  }, [status.mode, status.vapidPublicKey]);

  const resetLocal = useCallback(() => {
    localReset();
    setUser(null);
    setData(toPublic(emptyDb(), null));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      mode: status.mode,
      user,
      data,
      snapshot,
      snapshotError,
      pushEnabled: status.push,
      vapidPublicKey: status.vapidPublicKey,
      login,
      register,
      logout,
      act,
      refresh,
      enablePush,
      resetLocal,
    }),
    [act, data, enablePush, login, logout, ready, refresh, register, resetLocal, snapshot, snapshotError, status, user],
  );

  return (
    <AppContext.Provider value={value}>
      <Gate>{children}</Gate>
      <LaunchSplash />
    </AppContext.Provider>
  );
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp izvan providera");
  return value;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useApp();
  const path = usePathname();
  const router = useRouter();
  const pending = user?.status === "pending";
  const downloadPage = path === "/preuzmi";
  useEffect(() => {
    if (!ready) return;
    if (!user && path !== "/login" && path !== "/preuzmi") router.replace("/login");
    if (user && !pending && (path === "/login" || path === "/")) router.replace("/dashboard");
  }, [path, pending, ready, router, user]);

  if (downloadPage) {
    if (user && !pending) return <Shell>{children}</Shell>;
    return children;
  }
  if (pending) return <PendingScreen />;
  if (!ready || (!user && path !== "/login") || (user && (path === "/login" || path === "/"))) {
    return <Splash />;
  }
  if (!user) return children;
  return <Shell>{children}</Shell>;
}

function PendingScreen() {
  const { user, logout } = useApp();
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-ink px-6 text-center">
      <img src="/logo.jpg" alt="Krivi Quattro" className="h-28 w-28 rounded-full object-cover ring-2 ring-orange-500" />
      <h1 className="font-display mt-6 text-3xl font-bold">Čeka odobrenje admina</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        {user?.name}, račun je spremljen, ali još nemaš pristup rasporedu ni treninzima. Admin treba odobriti zahtjev.
      </p>
      <a href="/preuzmi" className="mt-6 text-sm text-orange-300">
        Preuzmi Android aplikaciju
      </a>
      <button type="button" className="mt-4 h-12 rounded-xl border border-white/15 px-5" onClick={() => logout()}>
        Odjava
      </button>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <img src="/logo.png" alt="Krivi Quattro" className="h-auto w-[92vw] max-w-[440px]" />
      <div className="-mt-1">
        <div className="font-display text-3xl font-bold tracking-wide">KRIVI QUATTRO</div>
        <div className="text-xs tracking-[0.28em] text-orange-400">DARTS CLUB</div>
      </div>
    </div>
  );
}

function previewAttendance(data: AppData, user: UserPublic, action: Action): AppData | null {
  if (action.op !== "attendance" && action.op !== "clearAttendance") return null;
  const rest = data.attendance.filter(
    (item) => !(item.userId === user.id && item.kind === action.kind && item.targetId === action.targetId),
  );
  if (action.op === "clearAttendance") return { ...data, attendance: rest };
  return {
    ...data,
    attendance: [
      ...rest,
      {
        id: `pending-${action.kind}-${action.targetId}`,
        kind: action.kind,
        targetId: action.targetId,
        userId: user.id,
        userName: user.name,
        status: action.status,
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
