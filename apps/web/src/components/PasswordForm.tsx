import { ArrowRight, LockKeyhole } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "./Button";

type PasswordFormProps = {
  mode: "setup" | "login";
  submitLabel: string;
  onSubmit: (password: string) => Promise<void>;
};

export function PasswordForm({
  mode,
  submitLabel,
  onSubmit
}: PasswordFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await onSubmit(password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isSetup = mode === "setup";
  const heading = isSetup ? "Create your admin password" : "Admin password";
  const helperText = isSetup
    ? "This is your first visit. Set the password used to unlock Debby."
    : "Enter your admin password to continue.";

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={handleSubmit}>
        <div className="auth-kicker">{isSetup ? "Initial setup" : "Welcome back"}</div>

        <div className="auth-panel-top">
          <div className="field-head">
            <span className="lock-badge">
              <LockKeyhole size={17} />
            </span>
            <span>{heading}</span>
          </div>
          <div className="auth-meter" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <p className="auth-helper">{helperText}</p>

        <label className="field">
          <span>Password</span>
          <input
            autoFocus
            minLength={8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter a private password"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="auth-actions">
          <Button disabled={loading} type="submit">
            <span>{loading ? "Please wait" : submitLabel}</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </main>
  );
}
