/**
 * Creates an admin user with a bcrypt-hashed password.
 *
 * Usage:
 *   npm run create-admin -- admin@example.com
 *
 * Connects with DATABASE_URL if set (e.g. Railway's DATABASE_PUBLIC_URL),
 * otherwise uses the DB_* variables from .env.
 */
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv/config";
import readline from "readline";

const { Pool } = pg;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let currentQuestion = "";
//mute echo so the password isn't shown while typing
rl._writeToOutput = (text) => {
  if (text.startsWith(currentQuestion)) rl.output.write(text);
};

//queue lines so piped input isn't lost between prompts
const lines = [];
const waiting = [];
rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
rl.on("close", () => waiting.forEach((resolve) => resolve(null)));

function promptHidden(question) {
  currentQuestion = question;
  rl.output.write(question);
  return new Promise((resolve) => {
    const done = (answer) => {
      process.stdout.write("\n");
      resolve(answer);
    };
    lines.length ? done(lines.shift()) : waiting.push(done);
  });
}

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: npm run create-admin -- <email>");
  rl.close();
  process.exit(1);
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    });

try {
  const password = await promptHidden("Password: ");
  const confirm = await promptHidden("Confirm password: ");
  rl.close();
  if (password === null || confirm === null) {
    throw new Error("No password entered");
  }
  if (password !== confirm) {
    throw new Error("Passwords do not match");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await pool.query("SELECT 1 FROM admin_users WHERE email = $1", [email]);
  if (existing.rowCount > 0) {
    throw new Error(`An admin with email ${email} already exists`);
  }

  const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await pool.query(
    "INSERT INTO admin_users (email, password) VALUES ($1, $2) RETURNING admin_id",
    [email, hashedPassword]
  );
  console.log(`Created admin ${email} (admin_id ${result.rows[0].admin_id})`);
} catch (err) {
  console.error("Error:", err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool.end();
}
