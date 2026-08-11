import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import type { Industry } from "../lib/types";
import { PublicShell } from "../components/Layout";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .industries()
      .then((res) => setIndustries(res.industries))
      .catch(() => setIndustries([]));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        organizationName,
        industryId: industryId || undefined,
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicShell>
      <div className="card p-6">
        <h1 className="text-lg font-bold text-slate-900">Create your organization</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Set up an account and start mapping skills to AI impact.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label" htmlFor="org">
              Organization name
            </label>
            <input
              id="org"
              className="input"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label" htmlFor="industry">
              Industry
            </label>
            <select
              id="industry"
              className="input"
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
            >
              <option value="">Select an industry…</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
