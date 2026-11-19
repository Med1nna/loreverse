import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen bg-[#0E0E0E] text-[#E8DFD0] flex flex-col items-center justify-center px-5"
      >
        <div className="bg-[#161616] border border-[#987654]/35 px-8 py-7 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <span className="inline-block w-2.5 h-2.5 bg-[#C5A059] animate-pulse" />
          <span className="font-display text-2xl tracking-[0.05em] text-[#E8DFD0]">
            LoreVerse
          </span>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#C5A059]">
            Verificando credenciais...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
