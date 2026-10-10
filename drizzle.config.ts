import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD ? `:${process.env.DB_PASSWORD}` : "";
const host = process.env.DB_HOST || "localhost";
const port = process.env.DB_PORT || 3306;
const database = process.env.DB_NAME || "wideservice";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: `mysql://${user}${password}@${host}:${port}/${database}`,
  },
});
