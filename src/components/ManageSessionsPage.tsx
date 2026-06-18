import * as React from "react";
import type { SessionRecord } from "../auth/session";

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function truncateId(id: string): string {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function ManageSessionsPage({
  sessions,
  currentSessionId,
  user,
}: {
  sessions: SessionRecord[];
  currentSessionId: string;
  user: string;
}) {
  return (
    <main className="page">
      <div className="manage-sessions">
        <h1>Manage Sessions</h1>
        <p className="manage-sub">
          Signed in as <strong>{user}</strong> &middot;{" "}
          <a href="/">Back to shop</a>
        </p>

        <div className="notice-box">
          <strong>Per-PoP notice:</strong> This cache is local to the FastEdge node
          serving this request. Sessions created at other edge nodes are not visible
          here. This is a demo fixture — a real session store would be a shared
          Redis or database.
        </div>

        {sessions.length === 0 ? (
          <p className="empty-sessions">No active sessions.</p>
        ) : (
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Username</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className={s.id === currentSessionId ? "current-session" : ""}>
                  <td className="session-id" title={s.id}>
                    {truncateId(s.id)}
                    {s.id === currentSessionId && (
                      <span className="session-current-badge"> (you)</span>
                    )}
                  </td>
                  <td>{s.username}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>
                    <form method="POST" action={`/manage-sessions/delete/${s.id}`}>
                      <button type="submit" className="btn-revoke">
                        Revoke
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form
          method="POST"
          action="/manage-sessions/purge"
          onSubmit={undefined}
        >
          <button type="submit" className="btn-purge">
            Purge All Sessions
          </button>
        </form>
      </div>
    </main>
  );
}
