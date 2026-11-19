import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { signIn } from "../../lib/auth";
import { ArchiveStamp } from "../components/ArchiveStamp";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [errors, setErrors] = useState<{ email?: string; senha?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-20 flex items-center justify-center"
      >
        <div className="bg-[#161616] border border-[#987654]/35 px-8 py-7 flex flex-col items-center gap-3 max-w-sm w-full text-center">
          <span className="inline-block w-2.5 h-2.5 bg-[#C5A059] animate-pulse" />
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#C5A059]">
            Verificando sessão...
          </p>
        </div>
      </section>
    );
  }

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const nextErrors: { email?: string; senha?: string } = {};

    if (!email.trim()) {
      nextErrors.email = "Informe o e-mail curatorial para prosseguir.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Informe um endereço de e-mail válido.";
    }

    if (!senha.trim()) {
      nextErrors.senha = "Informe a senha de acesso ao arquivo.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const result = await signIn(email, senha);
      if (result.error || !result.user) {
        setAuthError(result.error ?? "E-mail ou senha incorretos.");
        return;
      }
      navigate("/admin", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 md:py-24 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="relative pt-7">
          {/* Protruding File Tab */}
          <div className="absolute top-0 left-0 h-7 max-w-[85%] pl-4 pr-6 bg-[#1C1A17] border border-b-0 border-[#987654]/45 dossier-tab flex items-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059] truncate">
              CREDENCIAIS DE CURADORIA
            </span>
          </div>

          <div className="bg-[#161616] border border-[#987654]/40 p-5 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#726A5E]">
                <Lock className="w-3.5 h-3.5 text-[#DF6C4F] shrink-0" aria-hidden="true" />
                <span>ACESSO AO PAINEL</span>
              </div>
              <ArchiveStamp label="ÁREA RESTRITA" tone="terracotta" tilt="right" />
            </div>

            <h1 className="mt-5 sm:mt-6 font-display text-[clamp(1.85rem,5vw,2.5rem)] leading-tight text-[#E8DFD0] tracking-[0.02em]">
              Identificação do Arquivista
            </h1>
            <p className="mt-2 font-serif text-[15px] leading-relaxed text-[#B3A898]">
              Insira suas credenciais para acessar o painel de catalogação de
              universos e preservação de registros do LoreVerse.
            </p>

            <div className="my-6 divider-stitched" />

            {/* Stamped Archive Notice for Wrong Credentials */}
            {authError && (
              <div
                role="alert"
                className="mb-6 bg-[#1C1A17] border border-[#DF6C4F]/80 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <ArchiveStamp label="ACESSO NEGADO" tone="terracotta" tilt="left" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-[#726A5E]">
                    REGISTRO DE RECUSA
                  </span>
                </div>
                <p className="font-serif text-[15px] text-[#FFB4A2] leading-snug pt-0.5">
                  {authError}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                >
                  E-mail Curatorial
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  disabled={submitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    if (authError) setAuthError(null);
                  }}
                  placeholder="admin@loreverse.com"
                  className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-3 font-serif text-[16px] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none transition-colors disabled:opacity-60 ${
                    errors.email
                      ? "border-[#DF6C4F]"
                      : "border-[#987654]/45 focus:border-[#C5A059]"
                  }`}
                />
                {errors.email && (
                  <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="login-senha"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                >
                  Senha de Acesso
                </label>
                <input
                  id="login-senha"
                  type="password"
                  autoComplete="current-password"
                  disabled={submitting}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (errors.senha) setErrors((prev) => ({ ...prev, senha: undefined }));
                    if (authError) setAuthError(null);
                  }}
                  placeholder="••••••••••••"
                  className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-3 font-serif text-[16px] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none transition-colors disabled:opacity-60 ${
                    errors.senha
                      ? "border-[#DF6C4F]"
                      : "border-[#987654]/45 focus:border-[#C5A059]"
                  }`}
                />
                {errors.senha && (
                  <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                    {errors.senha}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] py-3.5 px-6 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-65 disabled:cursor-wait"
                >
                  {submitting ? "Verificando acesso..." : "Entrar no Arquivo"}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-[#1C1A17] flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                AUTENTICAÇÃO CURATORIAL
              </span>
              <Link
                to="/"
                className="min-h-[44px] inline-flex items-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#B3A898] hover:text-[#C5A059] transition-colors"
              >
                Voltar ao Acervo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
