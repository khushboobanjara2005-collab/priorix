"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  CirclePlus,
  ListTodo,
  Sparkles,
  ChartNoAxesColumn,
  Heart,
  Flower2,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: House },
  { name: "Add Task", href: "/add-task", icon: CirclePlus },
  { name: "My Tasks", href: "/my-tasks", icon: ListTodo },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
  {
    name: "Analytics",
    href: "/analytics",
    icon: ChartNoAxesColumn,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-icon">
          <Flower2 size={34} strokeWidth={1.7} />
        </div>

        <div>
          <h1>Priorix</h1>
          <p>Your Smart Study Planner</p>
        </div>
      </Link>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={23} strokeWidth={2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-quote">
        <Flower2 size={76} strokeWidth={1} />

        <p>
          Track Progress.
          <br />
          Stay Motivated.
          <br />
          Do More.
        </p>

        <Heart size={21} strokeWidth={1.7} />
      </div>
    </aside>
  );
}