import { useState } from "react";
import {
  Editor,
  Field,
  numeric,
  optional,
  text,
} from "../components/ui/Editor";
import { database, errorMessage } from "../lib/supabase";
import { saveRecord, unwrap } from "../services/tournamentService";
import { useTournament } from "./TournamentDashboard";
import { Logo, LogoInput } from "../components/ui/Logo";
import { uploadLogo } from "../services/logoService";

export function TeamsPage() {
  const { tournament, teams, players, reload } = useTournament();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<string>();
  const [message, setMessage] = useState("");
  const selected = teams.find((team) => team.id === edit);
  const filtered = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <h1>Teams</h1>
      <div className="management">
        <section>
          <label>
            Search teams
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {message && <p role="status">{message}</p>}
          {filtered.length === 0 && <p>No matching teams.</p>}
          {filtered.map((team) => {
            const members = players.filter(
              (player) => player.team_id === team.id,
            );
            return (
              <article className="tile" key={team.id}>
                {team.logo_path && (
                  <Logo path={team.logo_path} label={team.name + " logo"} />
                )}
                <h2>{team.name}</h2>
                {team.description && <p>{team.description}</p>}
                <p>
                  {members.length
                    ? members.map((player) => player.full_name).join(", ")
                    : "No roster members"}
                </p>
                <div className="actions">
                  <button onClick={() => setEdit(team.id)}>Edit team</button>
                  <button
                    className="secondary"
                    disabled={members.length > 0}
                    onClick={async () => {
                      if (!window.confirm("Remove this team?")) return;
                      try {
                        unwrap(
                          await database()
                            .from("teams")
                            .delete()
                            .eq("id", team.id)
                            .eq("tournament_id", tournament.id)
                            .select("id")
                            .single(),
                        );
                        if (edit === team.id) setEdit(undefined);
                        reload();
                        setMessage("Team removed.");
                      } catch (error) {
                        setMessage(errorMessage(error));
                      }
                    }}
                  >
                    Remove team
                  </button>
                </div>
              </article>
            );
          })}
        </section>
        <section className="tile">
          <h2>{selected ? "Edit team" : "Add team"}</h2>
          <Editor
            key={edit ?? "new"}
            save={async (form) => {
              const file = form.get("logo");
              const logo_path =
                file instanceof File && file.size
                  ? await uploadLogo(file, tournament.id)
                  : undefined;
              await saveRecord(
                {
                  table: "teams",
                  data: {
                    name: text(form, "name"),
                    description: optional(form, "description"),
                    logo_path,
                  },
                },
                edit,
                tournament.id,
              );
              reload();
            }}
          >
            <Field
              label="Team name"
              name="name"
              value={selected?.name}
              required
            />
            <label>
              Description
              <textarea
                name="description"
                defaultValue={selected?.description ?? ""}
                maxLength={1500}
              />
            </label>
            <LogoInput />
            {edit && (
              <button
                type="button"
                className="secondary"
                onClick={() => setEdit(undefined)}
              >
                Add another team
              </button>
            )}
          </Editor>
        </section>
      </div>
    </>
  );
}
export function PlayersPage() {
  const { tournament, players, teams, reload } = useTournament();
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("");
  const [edit, setEdit] = useState<string>();
  const selected = players.find((player) => player.id === edit);
  const filtered = players.filter(
    (player) =>
      player.full_name.toLowerCase().includes(search.toLowerCase()) &&
      (!team || (player.team_id ?? "independent") === team),
  );
  return (
    <>
      <h1>Players</h1>
      <div className="management">
        <section>
          <div className="form-grid">
            <label>
              Search players
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Filter team
              <select
                value={team}
                onChange={(event) => setTeam(event.target.value)}
              >
                <option value="">All teams</option>
                <option value="independent">Independent</option>
                {teams.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filtered.length === 0 ? (
            <p>No matching players.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Handicap</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((player) => (
                    <tr key={player.id}>
                      <td>{player.full_name}</td>
                      <td>
                        {teams.find((t) => t.id === player.team_id)?.name ??
                          "Independent"}
                      </td>
                      <td>{player.handicap ?? "—"}</td>
                      <td>{player.status}</td>
                      <td>
                        <button onClick={() => setEdit(player.id)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="tile">
          <h2>{selected ? "Edit player" : "Add player"}</h2>
          <Editor
            key={edit ?? "new"}
            save={async (form) => {
              await saveRecord(
                {
                  table: "players",
                  data: {
                    full_name: text(form, "name"),
                    team_id: optional(form, "team"),
                    player_number: optional(form, "number"),
                    handicap: numeric(form, "handicap"),
                    notes: optional(form, "notes"),
                    status: text(form, "status"),
                  },
                },
                edit,
                tournament.id,
              );
              reload();
            }}
          >
            <Field
              label="Full name"
              name="name"
              required
              value={selected?.full_name}
            />
            <label>
              Team
              <select name="team" defaultValue={selected?.team_id ?? ""}>
                <option value="">Independent</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Player number"
              name="number"
              value={selected?.player_number}
            />
            <Field
              label="Handicap"
              name="handicap"
              type="number"
              step={0.1}
              min={-20}
              max={54}
              value={selected?.handicap}
            />
            <label>
              Notes
              <textarea
                name="notes"
                maxLength={1500}
                defaultValue={selected?.notes ?? ""}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={selected?.status ?? "active"}>
                <option>active</option>
                <option>inactive</option>
              </select>
            </label>
            {edit && (
              <button
                type="button"
                className="secondary"
                onClick={() => setEdit(undefined)}
              >
                Add another player
              </button>
            )}
          </Editor>
        </section>
      </div>
    </>
  );
}
