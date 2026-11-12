import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function AuthRequired({
  title = "Sign in to see your workspace",
  message = "Your tasks and study data are private to your account.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section className="auth-required" aria-labelledby="auth-required-title">
      <div className="auth-required-icon"><LockKeyhole size={22} /></div>
      <div>
        <h2 id="auth-required-title">{title}</h2>
        <p>{message}</p>
      </div>
      <div className="auth-required-actions">
        <Link href="/login" className="secondary-button">Sign in</Link>
        <Link href="/register" className="primary-button">Create account</Link>
      </div>
    </section>
  );
}
