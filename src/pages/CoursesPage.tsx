import { useState } from "react";
import {
  Editor,
  Field,
  numeric,
  optional,
  text,
} from "../components/ui/Editor";
import { database } from "../lib/supabase";
import { unwrap } from "../services/tournamentService";
import type { Course } from "../types/golf";
import { useTournament } from "./TournamentDashboard";
function CourseForm({
  course,
  defaultHoles,
  tournamentId,
  onSaved,
}: {
  course?: Course;
  defaultHoles: number;
  tournamentId: string;
  onSaved: () => void;
}) {
  const [holes, setHoles] = useState(course?.number_of_holes ?? defaultHoles);
  return (
    <Editor
      save={async (form) => {
        const p_holes = Array.from({ length: holes }, (_, i) => ({
          par: numeric(form, "par" + i),
          yardage: numeric(form, "yards" + i),
        }));
        unwrap(
          await database().rpc("save_golf_course", {
            p_tournament: tournamentId,
            p_course: course?.id ?? null,
            p_name: text(form, "name"),
            p_location: optional(form, "location"),
            p_rating: numeric(form, "rating"),
            p_slope: numeric(form, "slope"),
            p_holes,
          }),
        );
        onSaved();
      }}
    >
      <div className="form-grid">
        <Field label="Course name" name="name" value={course?.name} required />
        <Field label="Location" name="location" value={course?.location} />
        <label>
          Number of holes
          <select
            value={holes}
            onChange={(event) => setHoles(Number(event.target.value))}
          >
            <option>18</option>
            <option>9</option>
          </select>
        </label>
        <Field
          label="Course rating"
          name="rating"
          type="number"
          step={0.1}
          min={20}
          max={99}
          value={course?.course_rating}
        />
        <Field
          label="Slope rating"
          name="slope"
          type="number"
          min={55}
          max={155}
          value={course?.slope_rating}
        />
      </div>
      <p>Leave par blank if it is unavailable.</p>
      <div className="hole-grid">
        {Array.from({ length: holes }, (_, i) => {
          const hole = course?.course_holes.find(
            (h) => h.hole_number === i + 1,
          );
          return (
            <div key={i}>
              <strong>Hole {i + 1}</strong>
              <Field
                label="Par"
                name={"par" + i}
                type="number"
                min={3}
                max={6}
                value={hole?.par}
              />
              <Field
                label="Yards"
                name={"yards" + i}
                type="number"
                min={1}
                value={hole?.yardage}
              />
            </div>
          );
        })}
      </div>
    </Editor>
  );
}
export function CoursesPage() {
  const { courses, tournament, settings, reload } = useTournament();
  const [id, setId] = useState("");
  const course = courses.find((c) => c.id === id);
  return (
    <>
      <h1>Courses</h1>
      <label>
        Course configuration
        <select value={id} onChange={(event) => setId(event.target.value)}>
          <option value="">Add a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <section className="tile">
        <h2>{course ? "Edit course" : "Add course"}</h2>
        <CourseForm
          key={id}
          course={course}
          defaultHoles={settings?.number_of_holes ?? 18}
          tournamentId={tournament.id}
          onSaved={reload}
        />
      </section>
    </>
  );
}
