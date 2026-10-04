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
