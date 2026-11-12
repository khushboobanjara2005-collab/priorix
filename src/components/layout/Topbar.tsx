"use client";

import { Search, Bell, UserRound } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function Topbar() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={19} />

        <input
          type="search"
          placeholder="Search tasks, deadlines or topics..."
          aria-label="Search tasks, deadlines or topics"
        />
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="notification-button"
          aria-label="Notifications"
        >
          <Bell size={22} />
          <span className="notification-dot" />
        </button>

        <div className="user-profile">
          <div className="user-avatar">
            <UserRound size={24} />
          </div>

          <div className="user-info">
            <strong>{isPending ? "Loading account..." : session ? `Hello, ${session.user.name}!` : "Welcome to Priorix"}</strong>
            <span>{session?.user.email ?? "Plan your next study session."}</span>
          </div>
        </div>

        {session ? (
          <button
            type="button"
            className="account-action"
            onClick={() => authClient.signOut()}
          >
            Sign out
          </button>
        ) : (
          <div className="account-actions">
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
          </div>
        )}
      </div>
    </header>
  );
}