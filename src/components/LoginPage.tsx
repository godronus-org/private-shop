import * as React from "react";

export function LoginPage({ next = "/", error }: { next?: string; error?: string }) {
  return (
    <main className="page">
      <div className="login-card">
        <h1>Sign in</h1>
        <form method="POST" action="/login">
          <input type="hidden" name="next" value={next} />
          {error && <p className="login-error">{error}</p>}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn-primary">Sign in</button>
        </form>
      </div>
    </main>
  );
}
