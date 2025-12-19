"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  // Handle keyboard events (Escape to close)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao fazer login");
      }

      // Refresh and trigger success
      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Sign up
      const signupRes = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!signupRes.ok) {
        const data = await signupRes.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao criar conta");
      }

      // Auto sign in after signup
      const signinRes = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!signinRes.ok) {
        // Signup succeeded but login failed - redirect to login
        router.push("/login?success=account_created");
        return;
      }

      // Refresh and trigger success
      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 bg-transparent backdrop:bg-black/70"
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-100">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Info */}
          <p className="text-sm text-neutral-400 mb-6">
            {mode === "login"
              ? "Entre para salvar sua análise e acessar todos os recursos."
              : "Crie sua conta para salvar análises e gerenciar seus flips."}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm text-neutral-400 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm text-neutral-400 mb-1.5"
                >
                  Senha
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-sm text-neutral-400 mb-1.5"
                >
                  Nome
                </label>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-sm text-neutral-400 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-sm text-neutral-400 mb-1.5"
                >
                  Senha
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          )}

          {/* Toggle */}
          <div className="mt-6 text-center text-sm text-neutral-500">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
