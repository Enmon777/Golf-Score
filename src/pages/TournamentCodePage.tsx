import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
export function TournamentCodePage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"))
      .trim()
      .toUpperCase();
    if (!/^GOLF-[A-Z0-9]{6,24}$/.test(code)) {
      setError("Enter the tournament code provided by the organizer.");
      return;
    }
    navigate("/t/" + code);
  }
  return (
    <section className="panel narrow">
      <Link to="/">Fairway</Link>
      <h1>Enter tournament code</h1>
      <form onSubmit={submit}>
        <label>
          Tournament code
          <input
            name="code"
            required
            autoCapitalize="characters"
            maxLength={29}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button>View tournament</button>
      </form>
    </section>
  );
}
