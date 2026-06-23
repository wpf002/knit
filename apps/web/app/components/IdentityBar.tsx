"use client";

import { useEffect, useState } from "react";
import { getDevUsers, getUid, setUid, type DevUser } from "../../lib/api";

// DEV-ONLY identity switcher. Auth is stubbed, so this stands in for "logged in
// as". Picking a user writes x-user-id to localStorage and reloads so every
// view re-fetches as that person. Remove when real sessions land.
export function IdentityBar() {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    getDevUsers()
      .then((list) => {
        setUsers(list);
        const uid = getUid();
        if (!uid && list[0]) {
          setUid(list[0].id);
          setCurrent(list[0].id);
        } else {
          setCurrent(uid);
        }
      })
      .catch(() => setUsers([]));
  }, []);

  if (users.length === 0) return null;

  return (
    <label
      className="hint"
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}
    >
      Viewing as
      <select
        value={current ?? ""}
        onChange={(e) => {
          setUid(e.target.value);
          window.location.reload();
        }}
        style={{
          font: "inherit",
          padding: "0.3rem 0.5rem",
          borderRadius: "0.4rem",
          border: "1px solid var(--line)",
        }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.displayName} (@{u.handle}){u.isCreator ? " · creator" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
