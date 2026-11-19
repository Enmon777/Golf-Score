import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { format } from "prettier";

const db = new PGlite();
const pgTypes = {
  uuid: "string",
  text: "string",
  date: "string",
  timestamptz: "string",
  int4: "number",
  int8: "number",
  numeric: "number",
  bool: "boolean",
  jsonb: "Json",
};
const nullableArgs = new Set([
  "p_description",
  "p_location",
  "p_course",
  "p_rating",
  "p_slope",
  "p_upload",
]);
try {
  await db.exec(await readFile("supabase/tests/bootstrap.sql", "utf8"));
  for (const path of (await readdir("supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile("supabase/migrations/" + path, "utf8"));
  }
  const columns = (
    await db.query(`select table_name,column_name,udt_name,is_nullable='YES' as nullable,column_default is not null as has_default
    from information_schema.columns where table_schema='public' order by table_name,ordinal_position`)
  ).rows;
  const relationships = (
    await db.query(`select source.relname as source, target.relname as target, c.conname as name,
    array(select a.attname from unnest(c.conkey) with ordinality k(n,i) join pg_attribute a on a.attrelid=source.oid and a.attnum=k.n order by k.i) as columns,
    array(select a.attname from unnest(c.confkey) with ordinality k(n,i) join pg_attribute a on a.attrelid=target.oid and a.attnum=k.n order by k.i) as references,
    exists(select from pg_constraint u where u.conrelid=source.oid and u.contype in ('u','p') and u.conkey=c.conkey) as one
    from pg_constraint c join pg_class source on source.oid=c.conrelid join pg_class target on target.oid=c.confrelid
    where c.contype='f' and source.relnamespace='public'::regnamespace and target.relnamespace='public'::regnamespace order by c.conname`)
  ).rows;
  const functions = (
    await db.query(`select p.proname as name,p.proargnames as names,ret.typname as result,
    array(select (a.oid::regtype)::text from unnest(p.proargtypes) with ordinality a(oid,ordinal) order by a.ordinal) as types
    from pg_proc p join pg_type ret on ret.oid=p.prorettype where p.pronamespace='public'::regnamespace order by p.proname`)
  ).rows;
  const tables = Object.groupBy(columns, (row) => row.table_name);
  const columnType = (column) =>
    (pgTypes[column.udt_name] ?? "unknown") +
    (column.nullable ? " | null" : "");
  const fields = (rows, mode) =>
    rows
      .map(
        (column) =>
          column.column_name +
          (mode === "update" ||
          (mode === "insert" && (column.nullable || column.has_default))
            ? "?"
            : "") +
          ": " +
          columnType(column),
      )
      .join("; ");
  const args = { integer: "number", ...pgTypes };
  let output = "// Generated from the local migrations by npm run db:types.\n";
  output +=
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n";
  output += "export type Database = { public: {\n  Tables: {\n";
  for (const [name, rows] of Object.entries(tables)) {
    const keys = relationships
      .filter((item) => item.source === name)
      .map(
        (item) =>
          `{ foreignKeyName: ${JSON.stringify(item.name)}; columns: ${JSON.stringify(item.columns)}; isOneToOne: ${item.one}; referencedRelation: ${JSON.stringify(item.target)}; referencedColumns: ${JSON.stringify(item.references)} }`,
      );
    output += `    ${name}: {\n      Row: { ${fields(rows, "row")} };\n      Insert: { ${fields(rows, "insert")} };\n      Update: { ${fields(rows, "update")} };\n      Relationships: [${keys.join(", ")}];\n    };\n`;
  }
  output += "  };\n  Views: Record<never, never>;\n  Functions: {\n";
  for (const fn of functions) {
    const parameters = fn.names
      .map(
        (name, index) =>
          name +
          ": " +
          (args[fn.types[index]] ?? "unknown") +
          (nullableArgs.has(name) ? " | null" : ""),
      )
      .join("; ");
    output += `    ${fn.name}: { Args: { ${parameters} }; Returns: ${pgTypes[fn.result] ?? "undefined"} };\n`;
  }
  output +=
    "  };\n  Enums: Record<never, never>;\n  CompositeTypes: Record<never, never>;\n} };\n";
  await writeFile(
    "src/types/database.ts",
    await format(output, { parser: "typescript" }),
  );
} finally {
  await db.close();
}
