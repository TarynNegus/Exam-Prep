"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/lib/auth-actions";

interface Props {
  mode: "login" | "signup";
  action: (state: AuthState, form: FormData) => Promise<AuthState>;
}

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto max-w-md card">
      <h1 className="mb-6 text-2xl font-bold">{isSignup ? "Create your account" : "Log in"}</h1>
      <form action={formAction} className="space-y-4">
        {isSignup && (
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input className="input" id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
            required
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {isSignup ? (
          <>Already have an account? <Link className="text-brand-600 underline" href="/login">Log in</Link></>
        ) : (
          <>New here? <Link className="text-brand-600 underline" href="/signup">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
