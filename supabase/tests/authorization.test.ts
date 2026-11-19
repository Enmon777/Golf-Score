import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";
const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
const request = "33333333-3333-4333-8333-333333333333";
const revision = "44444444-4444-4444-8444-444444444444";
const badRequest = "55555555-5555-4555-8555-555555555555";

test("migration enforces ownership, private files and atomic approval with spectator reporting", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("supabase/tests/bootstrap.sql", "utf8"));
    for (const path of (await readdir("supabase/migrations"))
      .filter((path) => path.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile("supabase/migrations/" + path, "utf8"));
    }
    async function actor(role: "authenticated" | "anon", id = "") {
      await db.exec("reset role; set role " + role);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    }
    async function scalar<T>(sql: string, params: unknown[] = []) {
      return (await db.query<{ value: T }>(sql, params)).rows[0]?.value;
    }
    const create = (name: string) =>
      scalar<string>(
        "select create_golf_tournament($1,'2026-11-18','2026-11-20','America/Chicago','team_aggregate',9,1,null,null) as value",
        [name],
      );
    await db.query(
      'insert into auth.users values($1,\'{"full_name":"Owner A"}\'),($2,\'{"full_name":"Owner B"}\')',
      [ownerA, ownerB],
    );
    await actor("authenticated", ownerB);
    const other = await create("Other event");
    const otherTeam = await scalar<string>(
      "insert into teams(tournament_id,name) values($1,'Other team') returning id as value",
      [other],
    );
    await actor("authenticated", ownerA);
    const event = await create("Bent Creek Open");
    const code = await scalar<string>(
      "select tournament_code as value from tournaments where id=$1",
      [event],
    );
    expect(code).toMatch(/^GOLF-[A-F0-9]{16}$/);
    expect(
      await scalar<number>("select count(*)::int as value from tournaments"),
    ).toBe(1);
    expect(
      (
        await db.query("update tournaments set name='Changed' where id=$1", [
          other,
        ])
      ).affectedRows,
    ).toBe(0);
    await expect(
      db.query(
        "insert into players(tournament_id,team_id,full_name) values($1,$2,'Cross tournament')",
        [event, otherTeam],
      ),
    ).rejects.toThrow(/foreign key/);
    const team = await scalar<string>(
      "insert into teams(tournament_id,name) values($1,'Green') returning id as value",
      [event],
    );
    const player = await scalar<string>(
      "insert into players(tournament_id,team_id,full_name,notes) values($1,$2,'Alex Woods','private note') returning id as value",
      [event, team],
    );
    const tiedPlayer = await scalar<string>(
      "insert into players(tournament_id,full_name) values($1,'Taylor Green') returning id as value",
      [event],
    );
    const course = await scalar<string>(
      "select save_golf_course($1,null,'Bent Creek',null,null,null,$2::jsonb) as value",
      [
        event,
        JSON.stringify(
          Array.from({ length: 9 }, () => ({ par: 4, yardage: 350 })),
        ),
      ],
    );
    const round = await scalar<string>(
      "insert into tournament_rounds(tournament_id,course_id,round_number,name,start_time) values($1,$2,1,'Opening round','2026-11-18T16:00Z') returning id as value",
      [event, course],
    );
    const final = await scalar<string>(
      "insert into tournament_rounds(tournament_id,course_id,round_number,name,start_time) values($1,$2,2,'Final round','2026-11-19T16:00Z') returning id as value",
      [event, course],
    );
    const path = event + "/original.jpg";
    await db.query(
      "insert into storage.objects values('scorecard-images',$1)",
      [path],
    );
    const upload = await scalar<string>(
      "select register_golf_scan($1,$2,$3,'{}') as value",
      [event, round, path],
    );
    expect(
      (await db.query("delete from storage.objects where name=$1", [path]))
        .affectedRows,
    ).toBe(0);
    const rows = [player, tiedPlayer].map((player_id) => ({
      player_id,
      strokes: Array(9).fill(4),
      expected_revision: 0,
    }));
    const approve = (
      batch: unknown,
      token = request,
      selectedUpload: string | null = upload,
      selectedRound = round,
    ) =>
      db.query("select approve_golf_scores($1,$2,$3,$4,$5::jsonb)", [
        event,
        selectedRound,
        token,
        selectedUpload,
        JSON.stringify(batch),
      ]);
    await expect(
      approve([rows[0], { ...rows[1], strokes: [4] }], badRequest),
    ).rejects.toThrow(/every hole/);
    expect(
      await scalar<number>("select count(*)::int as value from scorecards"),
    ).toBe(0);
    await approve(rows);
    await approve(rows);
    expect(
      await scalar<number>("select count(*)::int as value from scorecards"),
    ).toBe(2);
    expect(
      await scalar<number>(
        "select count(*)::int as value from score_audit_logs",
      ),
    ).toBe(2);
    expect(
      await scalar<number>("select count(*)::int as value from hole_scores"),
    ).toBe(18);
    expect(
      await scalar<string>(
        "select scan_status as value from scorecard_uploads where id=$1",
        [upload],
      ),
    ).toBe("approved");
    expect(
      await scalar<number>(
        "select (owner_golf_report($1)->'individual'->1->>'position')::int as value",
        [event],
      ),
    ).toBe(1);
    await expect(approve([rows[0]], badRequest, null)).rejects.toThrow(
      /Scores changed/,
    );
    await approve(
      [
        {
          ...rows[0],
          strokes: Array(9).fill(5),
          expected_revision: 1,
          reason: "Checked original",
        },
      ],
      revision,
      null,
    );
    await approve([rows[0]], badRequest, null, final);
    expect(
      await scalar<number>(
        "select (owner_golf_report($1)->'individual'->0->>'strokes')::int as value",
        [event],
      ),
    ).toBe(81);
    expect(
      await scalar<number>(
        "select (owner_golf_report($1)->'teams'->0->>'strokes')::int as value",
        [event],
      ),
    ).toBe(81);
    await actor("authenticated", ownerB);
    expect(
      await scalar<number>(
        "select count(*)::int as value from storage.objects",
      ),
    ).toBe(0);
    await expect(
      db.query("select owner_golf_report($1)", [event]),
    ).rejects.toThrow(/unavailable/);
    await expect(approve(rows)).rejects.toThrow(/unavailable/);
    await actor("anon");
    await expect(db.query("select * from tournaments")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("insert into teams(tournament_id,name) values($1,'Intruder')", [
        event,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(approve(rows)).rejects.toThrow(/permission denied/);
    const publicData = await scalar<Record<string, unknown>>(
      "select public_golf_tournament($1) as value",
      [code],
    );
    expect(JSON.stringify(publicData)).not.toMatch(
      /private note|owner_id|storage_path|approved_by|Other team/,
    );
    expect(
      await scalar("select public_golf_tournament($1) as value", [
        "GOLF-0000000000000000",
      ]),
    ).toBeNull();
    expect(publicData.cards).toHaveLength(3);
    await actor("authenticated", ownerA);
    const rotated = await scalar<string>(
      "select rotate_golf_code($1) as value",
      [event],
    );
    expect(rotated).not.toBe(code);
    await actor("anon");
    expect(
      await scalar("select public_golf_tournament($1) as value", [code]),
    ).toBeNull();
    expect(
      await scalar("select public_golf_tournament($1) as value", [rotated]),
    ).toBeTruthy();
  } finally {
    await db.close();
  }
}, 30000);
