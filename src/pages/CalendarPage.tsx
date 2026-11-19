import { useState } from "react";
import { Link } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import "@fullcalendar/react/skeleton.css";
import { DateTime } from "luxon";
import {
  Editor,
  Field,
  labelState,
  states,
  text,
} from "../components/ui/Editor";
import { saveRecord } from "../services/tournamentService";
import type { Course, Round, Tournament } from "../types/golf";
import { useTournament } from "./TournamentDashboard";
export function Schedule({
  tournament,
  rounds,
  courses,
  onSelect,
}: {
  tournament: Pick<Tournament, "start_date" | "timezone">;
  rounds: Round[];
  courses: Pick<Course, "id" | "name">[];
  onSelect?: (id: string) => void;
}) {
  const [view, setView] = useState("table");
  return (
    <>
      <label>
        Schedule view
        <select value={view} onChange={(event) => setView(event.target.value)}>
          <option value="table">Table</option>
          <option value="calendar">Calendar</option>
        </select>
      </label>
      <p>{tournament.timezone}</p>
      {view === "calendar" ? (
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          initialDate={tournament.start_date}
          timeZone={tournament.timezone}
          height="auto"
          eventClick={(event) => onSelect?.(event.event.id)}
          events={rounds.map((r) => ({
            id: r.id,
            title: r.name + " · " + labelState(r.status),
            start: r.start_time,
          }))}
        />
      ) : rounds.length === 0 ? (
        <p>No rounds scheduled.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Course</th>
                <th>Start time</th>
                <th>Status</th>
                {onSelect && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.round_number}. {r.name}
                  </td>
                  <td>
                    {courses.find((c) => c.id === r.course_id)?.name ?? "—"}
                  </td>
                  <td>
                    {DateTime.fromISO(r.start_time)
                      .setZone(tournament.timezone)
                      .toLocaleString(DateTime.DATETIME_MED)}
                  </td>
                  <td>{labelState(r.status)}</td>
                  {onSelect && (
                    <td>
                      <button onClick={() => onSelect(r.id)}>Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function CalendarPage() {
  const { tournament, courses, rounds, cards, reload } = useTournament();
  const [id, setId] = useState("");
  const round = rounds.find((r) => r.id === id);
  return (
    <>
      <h1>Calendar</h1>
      <Schedule
        tournament={tournament}
        courses={courses}
        rounds={rounds}
        onSelect={setId}
      />
      <section className="tile">
        <h2>{round ? "Edit round" : "Schedule a round"}</h2>
        {courses.length === 0 ? (
          <Link to="../courses">Set up a course first</Link>
        ) : (
          <Editor
            key={id}
            save={async (form) => {
              const datetime = DateTime.fromISO(text(form, "start"), {
                zone: tournament.timezone,
              });
              if (
                !datetime.isValid ||
                datetime.toFormat("yyyy-MM-dd'T'HH:mm") !==
                  text(form, "start") ||
                datetime.getPossibleOffsets().length > 1
              )
                throw new Error(
                  "Choose an unambiguous local time in the tournament time zone.",
                );
              await saveRecord(
                {
                  table: "tournament_rounds",
                  data: {
                    round_number: Number(text(form, "number")),
                    name: text(form, "name"),
                    course_id: text(form, "course"),
                    status: text(form, "status"),
                    start_time: datetime.toUTC().toISO()!,
                  },
                },
                round?.id,
                tournament.id,
              );
              reload();
            }}
          >
            <div className="form-grid">
              <Field
                label="Round name"
                name="name"
                value={round?.name}
                required
              />
              <Field
                label="Round number"
                name="number"
                type="number"
                min={1}
                value={
                  round?.round_number ??
                  Math.max(0, ...rounds.map((r) => r.round_number)) + 1
                }
                required
              />
              <Field
                label="Local start time"
                name="start"
                type="datetime-local"
                value={
                  round
                    ? DateTime.fromISO(round.start_time)
                        .setZone(tournament.timezone)
                        .toFormat("yyyy-MM-dd'T'HH:mm")
                    : ""
                }
                required
              />
              <label>
                Course
                <select
                  name="course"
                  required
                  defaultValue={round?.course_id ?? ""}
                >
                  {!round && <option value="">Select course</option>}
                  {courses
                    .filter(
                      (c) =>
                        !cards.some((card) => card.round_id === round?.id) ||
                        c.id === round?.course_id,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.number_of_holes} holes
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={round?.status ?? "scheduled"}
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {labelState(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {round && (
              <button
                type="button"
                className="secondary"
                onClick={() => setId("")}
              >
                Schedule another round
              </button>
            )}
          </Editor>
        )}
      </section>
    </>
  );
}
