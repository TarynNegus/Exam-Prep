import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";

const STEPS = [
  {
    title: "Follow your syllabus",
    body: "Every subject is broken into the content sections of its Cambridge syllabus. Work through them in order, one topic at a time.",
  },
  {
    title: "Practise exam-style questions",
    body: "Answer questions drawn from past papers. Objective answers are marked instantly; written answers are checked against the mark scheme.",
  },
  {
    title: "Learn from examiners",
    body: "Every answer comes with mark scheme points and examiner's report commentary showing where candidates gain and lose marks.",
  },
  {
    title: "Sit full past papers",
    body: "Once every topic is complete, take full timed past papers and see your results broken down by syllabus topic.",
  },
];

export default async function Home() {
  if (await currentUser()) redirect("/dashboard");

  return (
    <div className="space-y-16">
      <section className="py-10 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Master your Cambridge exams, one syllabus topic at a time
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Structured practice for Cambridge IGCSE and International AS &amp; A Level, with feedback from mark schemes
          and examiner reports.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start for free</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">Log in</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="card">
            <div className="mb-2 text-sm font-bold text-brand-600">Step {i + 1}</div>
            <h2 className="mb-2 font-semibold">{step.title}</h2>
            <p className="text-sm text-slate-600">{step.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">Pricing</h2>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          <div className="card">
            <h3 className="font-semibold">Free</h3>
            <p className="my-2 text-3xl font-bold">$0</p>
            <p className="text-sm text-slate-600">The first topics of every subject, with full feedback.</p>
          </div>
          {PLANS.map((plan) => (
            <div key={plan.id} className="card border-brand-600">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="my-2 text-3xl font-bold">{plan.priceLabel}</p>
              <p className="text-sm text-slate-600">{plan.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
