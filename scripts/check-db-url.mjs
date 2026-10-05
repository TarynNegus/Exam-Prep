// Checks DATABASE_URL and DIRECT_URL for common setup mistakes before
// connecting, and explains what to fix. Never prints the password itself.
// Usage: node scripts/check-db-url.mjs

const problems = [];
const projectRefs = new Set();

function check(name, expectedPort) {
  const raw = process.env[name];
  console.log(`\n${name}`);
  if (!raw) {
    problems.push(`${name} is not set. Add it as a repository secret (or to .env when running locally).`);
    console.log("  not set");
    return;
  }
  if (raw !== raw.trim() || /^["']|["']$/.test(raw.trim())) {
    problems.push(`${name} has spaces or quote marks at the start or end. Paste the connection string on its own, without quotes.`);
  }

  let url;
  try {
    url = new URL(raw.trim().replace(/^["']|["']$/g, ""));
  } catch {
    problems.push(
      `${name} is not a valid connection string. This usually means the password contains a symbol such as @ # / ? : or %. ` +
        "Reset the database password in Supabase to letters and numbers only, then copy the string again.",
    );
    console.log("  could not be read as a connection string");
    return;
  }

  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const port = url.port || "5432";
  const isPooler = url.hostname.endsWith("pooler.supabase.com");
  console.log(`  username: ${user || "(none)"}`);
  console.log(`  host:     ${url.hostname}`);
  console.log(`  port:     ${port}`);
  console.log(`  password: ${password ? `${password.length} characters` : "(none)"}`);

  if ((raw.match(/@/g) ?? []).length > 1 || url.hash || !url.hostname.includes(".") && url.hostname !== "localhost") {
    problems.push(
      `${name}: the password seems to contain a symbol such as @ # / or ?, which breaks the connection string. ` +
        "Reset the database password in Supabase to letters and numbers only, then copy the string again.",
    );
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) problems.push(`${name} must start with postgresql://`);
  if (!password) problems.push(`${name} has no password. Replace [YOUR-PASSWORD] with your database password.`);
  if (/YOUR-PASSWORD|\[|\]/i.test(raw)) {
    problems.push(`${name} still contains [YOUR-PASSWORD] or square brackets. Replace the whole of [YOUR-PASSWORD], brackets included, with your password.`);
  }
  if (isPooler && !user.includes(".")) {
    problems.push(
      `${name} uses the Supabase pooler but the username is "${user}". It must be "postgres." followed by your project ID, ` +
        "for example postgres.abcdefghijklmnop. Copy the string again from Supabase's Connect panel.",
    );
  }
  if (user.includes(".")) projectRefs.add(user.split(".").slice(1).join("."));
  if (isPooler && port !== expectedPort) {
    problems.push(`${name} uses port ${port}; expected ${expectedPort} (${expectedPort === "6543" ? "Transaction pooler" : "Session pooler"}).`);
  }
  if (isPooler && name === "DATABASE_URL" && port === "6543" && url.searchParams.get("pgbouncer") !== "true") {
    problems.push("DATABASE_URL must end with ?pgbouncer=true&connection_limit=1");
  }
}

check("DATABASE_URL", "6543");
check("DIRECT_URL", "5432");
if (projectRefs.size > 1) problems.push("DATABASE_URL and DIRECT_URL contain different project IDs. Copy both from the same Supabase project.");

if (problems.length) {
  console.log("\nProblems found:");
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log(
  "\nThe connection strings look correctly formatted. If the login still fails, the password itself is wrong: " +
    "reset it in Supabase (Project Settings > Database) to letters and numbers only, and update both secrets.",
);
