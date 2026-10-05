"use server";

import { redirect } from "next/navigation";
import { db } from "./db";
import { requireUser } from "./session";

export async function enrol(subjectId: string) {
  const user = await requireUser();
  await db.enrolment.upsert({
    where: { userId_subjectId: { userId: user.id, subjectId } },
    update: {},
    create: { userId: user.id, subjectId },
  });
  redirect(`/subjects/${subjectId}`);
}

export async function unenrol(subjectId: string) {
  const user = await requireUser();
  await db.enrolment.deleteMany({ where: { userId: user.id, subjectId } });
  redirect("/dashboard");
}

/** Saves the combination of papers a student is taking, enrolling them if needed. */
export async function chooseRoute(subjectId: string, form: FormData) {
  const user = await requireUser();
  const routeId = String(form.get("routeId") ?? "");
  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { routes: true } });
  const routes = (subject?.routes ?? []) as { id: string }[];
  if (!routes.some((r) => r.id === routeId)) redirect(`/subjects/${subjectId}`);
  await db.enrolment.upsert({
    where: { userId_subjectId: { userId: user.id, subjectId } },
    update: { routeId },
    create: { userId: user.id, subjectId, routeId },
  });
  redirect(`/subjects/${subjectId}`);
}
