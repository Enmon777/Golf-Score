import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Editor,
  Field,
  optional,
  states,
  text,
  labelState,
} from "../components/ui/Editor";
import { database, errorMessage } from "../lib/supabase";
import { unwrap } from "../services/tournamentService";
import { useTournament } from "./TournamentDashboard";
import type { Settings, Tournament } from "../types/golf";
import { Logo, LogoInput } from "../components/ui/Logo";
import { uploadLogo } from "../services/logoService";
function Details({ t, s }: { t?: Tournament; s?: Settings | null }) {
  return (
    <>
      <Field label="Tournament name" name="name" value={t?.name} required />
      <div className="form-grid">
        <Field
          label="Start date"
          name="start"
          type="date"
          value={t?.start_date}
          required
        />
        <Field
          label="End date"
          name="end"
          type="date"
          value={t?.end_date}
          required
        />
        <Field
          label="Tournament time zone"
          name="timezone"
          value={
            t?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
          }
          required
        />
        <Field label="Location" name="location" value={t?.location} />
        <label>
          Scoring format
          <select name="format" defaultValue={t?.scoring_format}>
            <option value="individual">Individual stroke play</option>
            <option value="team_aggregate">Team aggregate stroke play</option>
          </select>
        </label>
        <label>
          Default holes
          <select name="holes" defaultValue={s?.number_of_holes ?? 18}>
            <option>18</option>
            <option>9</option>
          </select>
        </label>
        <Field
          label="Counting players per team"
          name="count"
          type="number"
          min={1}
          max={100}
          value={s?.counting_players ?? 4}
          required
        />
      </div>
      <label>
        Description
        <textarea
          name="description"
          maxLength={2000}
          defaultValue={t?.description ?? ""}
        />
      </label>
    </>
  );
}
export function CreateTournamentPage() {
  const navigate = useNavigate();
  return (
    <main className="panel narrow">
      <Link to="/dashboard">My tournaments</Link>
      <h1>Create tournament</h1>
      <Editor
        submitLabel="Create tournament"
        save={async (form) => {
          const id = unwrap(
            await database().rpc("create_golf_tournament", {
              p_name: text(form, "name"),
              p_start: text(form, "start"),
              p_end: text(form, "end"),
              p_timezone: text(form, "timezone"),
              p_format: text(form, "format"),
              p_holes: Number(text(form, "holes")),
              p_count: Number(text(form, "count")),
              p_description: optional(form, "description"),
              p_location: optional(form, "location"),
            }),
          );
          if (!id) throw new Error("Tournament creation did not return an ID.");
          const file = form.get("logo");
          if (file instanceof File && file.size) {
            try {
              const logo_path = await uploadLogo(file, id);
              unwrap(
                await database()
                  .from("tournaments")
                  .update({ logo_path })
                  .eq("id", id)
                  .select("id")
                  .single(),
              );
            } catch (error) {
              navigate("/dashboard/tournaments/" + id + "/settings", {
                state: { logoError: errorMessage(error) },
              });
              return;
            }
          }
          navigate("/dashboard/tournaments/" + id);
        }}
      >
        <Details />
        <LogoInput />
      </Editor>
    </main>
  );
}
export function TournamentSettings() {
  const { tournament: t, settings: s, reload } = useTournament();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { state } = useLocation();
  const [logoError, setLogoError] = useState<string>(
    typeof state?.logoError === "string" ? state.logoError : "",
  );
  return (
    <>
      <h1>Settings</h1>
      <section className="tile">
        <h2>Spectator code</h2>
        <p>{t.tournament_code}</p>
        <div className="actions">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(t.tournament_code);
                setMessage("Code copied.");
                setError("");
              } catch (error) {
                setError(errorMessage(error));
              }
            }}
          >
            Copy code
          </button>
          <button
            className="secondary"
            onClick={async () => {
              if (
                !window.confirm(
                  "Regenerate the code? The previous code will stop working.",
                )
              )
                return;
              try {
                unwrap(
                  await database().rpc("rotate_golf_code", {
                    p_tournament: t.id,
                  }),
                );
                reload();
                setMessage("New code generated.");
                setError("");
              } catch (error) {
                setError(errorMessage(error));
              }
            }}
          >
            Regenerate code
          </button>
        </div>
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </section>
      <section className="tile">
        <h2>Tournament logo</h2>
        {t.logo_path && <Logo path={t.logo_path} label={t.name + " logo"} />}
        {logoError && (
          <p role="alert">
            Tournament created. The logo upload needs attention. {logoError}
          </p>
        )}
        <Editor
          submitLabel="Save logo"
          save={async (form) => {
            const file = form.get("logo");
            if (!(file instanceof File) || !file.size)
              throw new Error("Choose a logo image.");
            const logo_path = await uploadLogo(file, t.id);
            unwrap(
              await database()
                .from("tournaments")
                .update({ logo_path })
                .eq("id", t.id)
                .select("id")
                .single(),
            );
            setLogoError("");
            reload();
          }}
        >
          <LogoInput />
        </Editor>
      </section>
      <section className="tile">
        <Editor
          save={async (form) => {
            unwrap(
              await database().rpc("update_golf_settings", {
                p_tournament: t.id,
                p_name: text(form, "name"),
                p_start: text(form, "start"),
                p_end: text(form, "end"),
                p_timezone: text(form, "timezone"),
                p_format: text(form, "format"),
                p_holes: Number(text(form, "holes")),
                p_count: Number(text(form, "count")),
                p_policy: text(form, "policy"),
                p_status: text(form, "status"),
                p_description: optional(form, "description"),
                p_location: optional(form, "location"),
              }),
            );
            reload();
          }}
        >
          <Details t={t} s={s} />
          <label>
            Team scoring policy
            <select
              name="policy"
              defaultValue={s?.team_scoring_policy ?? "best_n"}
            >
              <option value="best_n">Best N scores each round</option>
              <option value="all">All rostered players</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={t.status}>
              {states.map((status) => (
                <option value={status} key={status}>
                  {labelState(status)}
                </option>
              ))}
            </select>
          </label>
        </Editor>
      </section>
    </>
  );
}
