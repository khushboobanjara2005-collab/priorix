"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flower2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "register";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = isRegister
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });

      if (result.error) {
        setError(result.error.message || "We could not sign you in. Check your details and try again.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("The account service is unavailable. Check your setup and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <Link href="/" className="auth-back-link">
          <ArrowLeft size={16} />
          Back to Priorix
        </Link>

        <div className="auth-brand-mark">
          <Flower2 size={29} />
        </div>
        <p className="auth-eyebrow">YOUR STUDY WORKSPACE</p>
        <h1 id="auth-title">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-copy">
          {isRegister
            ? "Save your study plan and keep your progress in one place."
            : "Sign in to continue planning your study sessions."}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <label>
              <span>Your name</span>
              <span className="auth-input-wrap">
                <UserRound size={17} />
                <input
                  autoComplete="name"
                  maxLength={80}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </span>
            </label>
          )}
          <label>
            <span>Email address</span>
            <span className="auth-input-wrap">
              <Mail size={17} />
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label>
            <span>Password</span>
            <span className="auth-input-wrap">
              <LockKeyhole size={17} />
              <input
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 10 : undefined}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
            {isRegister && <small>Use at least 10 characters.</small>}
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to Priorix?"}{" "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
