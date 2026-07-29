import { neon } from "@neondatabase/serverless";
import { getPrivateNeonEnvironment } from "@/lib/env";

export function createPrivilegedSql() {
  return neon(getPrivateNeonEnvironment().DATABASE_URL);
}
