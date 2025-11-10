import React, { useState, useMemo } from "react";

const STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

const AUTHORITIES = [
  { name: "Lower Murray Water", code: "LMW", state: "VIC" },
  // Add more later as needed
];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [query, setQuery] = useState("");

  const filteredAuthorities = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return AUTHORITIES;
    return AUTHORITIES.filter(
      (a) => a.name.toLowerCase().includes(s) || a.code.toLowerCase().includes(s)
    );
  }, [query]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const response = await fetch("/api/lmw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data?.error ||
          data?.statusText ||
          `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (data?.ok === false) {
        throw new Error(data?.error || "Authority rejected the request");
      }

      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err || "Unknown error");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e6f0ff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>
            OFM — Certificate Fulfillment
          </h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            First authority: Lower Murray Water (VIC)
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          {/* State + Authority */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 16,
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>State</span>
              <select
                name="state"
                required
                defaultValue="VIC"
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gap: 6 }}>
              <span>Authority</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search authority..."
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              />
              <select
                name="authority"
                required
                defaultValue="LMW"
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              >
                {filteredAuthorities.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name} ({a.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Order + Lot/Plan */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>Order ID</span>
              <input
                name="orderId"
                required
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Lot/Plan</span>
              <input
                name="lotPlan"
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              />
            </label>
          </div>

          {/* Property Address */}
          <label style={{ display: "grid", gap: 6 }}>
            <span>Property Address</span>
            <input
              name="propertyAddress"
              required
              style={{
                background: "#0e162f",
                color: "#e6f0ff",
                border: "1px solid #233055",
                borderRadius: 6,
                padding: "10px 12px",
              }}
            />
          </label>

          {/* Client Names */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>Client First Name</span>
              <input
                name="clientFirstName"
                required
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Middle Name</span>
              <input
                name="clientMiddleName"
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Last Name</span>
              <input
                name="clientLastName"
                required
                style={{
                  background: "#0e162f",
                  color: "#e6f0ff",
                  border: "1px solid #233055",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              />
            </label>
          </div>

          {/* From Dye & Durham — Receive Email */}
          <label style={{ display: "grid", gap: 6 }}>
            <span>From Dye & Durham — Receive Email</span>
            <input
              type="email"
              name="receiveEmail"
              placeholder="name@dyedurham.com"
              style={{
                background: "#0e162f",
                color: "#e6f0ff",
                border: "1px solid #233055",
                borderRadius: 6,
                padding: "10px 12px",
              }}
            />
            <small style={{ opacity: 0.7, fontSize: 12 }}>
              Optional. We’ll include this in the payload for LMW or internal notifications.
            </small>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "transparent",
              color: "#e6f0ff",
              border: "1px solid #3a61ff",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Submitting..." : "Submit to Authority"}
          </button>
        </form>

        {/* Result */}
        <section
          style={{
            marginTop: 24,
            background: "#0e162f",
            border: "1px solid #233055",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Result</h2>
          {error && (
            <p style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</p>
          )}
          {!error && result && (
            <pre style={{ fontSize: 12, overflow: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
          {!error && !result && (
            <p style={{ opacity: 0.7, fontSize: 14 }}>No submission yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}