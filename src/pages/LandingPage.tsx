import { Flag, CalendarDays, ScanLine, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="welcome">
      <header className="site-header">
        <Link className="brand" to="/">
          <Flag size={21} /> Fairway
        </Link>
        <Link to="/signin">Sign in</Link>
      </header>
      <main className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Golf tournament management</p>
          <h1>
            From tee time
            <br />
            to final standings.
          </h1>
          <p>
            Schedule rounds, verify scorecards, and share live standings with
            players and spectators.
          </p>
          <div className="actions">
            <Link className="button" to="/signup">
              Sign up
            </Link>
            <Link className="button secondary" to="/tournament-access">
              Enter tournament code
            </Link>
          </div>
        </div>
        <div className="feature-list">
          <div>
            <CalendarDays />
            <h2>Schedule rounds</h2>
            <p>Keep courses, tee times, and rosters together.</p>
          </div>
          <div>
            <ScanLine />
            <h2>Verify scorecards</h2>
            <p>Review scores from a photo or enter them by hand.</p>
          </div>
          <div>
            <Trophy />
            <h2>Share standings</h2>
            <p>Give spectators access with a tournament code.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
