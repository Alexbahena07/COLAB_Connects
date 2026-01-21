"use client";

import { useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

type CandidateSkill = { name: string; years: number | null };
type CandidateExperience = {
  id: string;
  title: string | null;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  employmentType: string | null;
  description: string | null;
};
type CandidateDegree = {
  id: string;
  school: string | null;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  headline: string | null;
  desiredLocation: string | null;
  skills: CandidateSkill[];
  degrees: CandidateDegree[];
  experiences: CandidateExperience[];
  yearsOutUndergrad: number | null;
  yearsOutGraduate: number | null;
  isSaved: boolean;
};

type Filters = {
  q: string;
  location: string;
  skills: string;
  employmentType: string;
  ugYearsOutMin: string;
  ugYearsOutMax: string;
  gradYearsOutMin: string;
  gradYearsOutMax: string;
};

const EMPLOYMENT_TYPE_OPTIONS = ["Full-time", "Part-time", "Internship"];

const defaultFilters: Filters = {
  q: "",
  location: "",
  skills: "",
  employmentType: "",
  ugYearsOutMin: "",
  ugYearsOutMax: "",
  gradYearsOutMin: "",
  gradYearsOutMax: "",
};

const parseSkills = (value: string) =>
  value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

const formatDate = (value: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "" : parsed.toLocaleDateString();
};

export default function CompanyCandidatesPage() {
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [savedCandidateIds, setSavedCandidateIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  const buildQuery = (current: Filters, nextPage: number) => {
    const params = new URLSearchParams();
    if (current.q) params.set("q", current.q);
    if (current.location) params.set("location", current.location);
    const skills = parseSkills(current.skills);
    if (skills.length > 0) params.set("skills", skills.join(","));
    if (current.employmentType) {
      params.set("employmentTypes", current.employmentType);
    }
    if (current.ugYearsOutMin) params.set("ugYearsOutMin", current.ugYearsOutMin);
    if (current.ugYearsOutMax) params.set("ugYearsOutMax", current.ugYearsOutMax);
    if (current.gradYearsOutMin) params.set("gradYearsOutMin", current.gradYearsOutMin);
    if (current.gradYearsOutMax) params.set("gradYearsOutMax", current.gradYearsOutMax);
    params.set("page", `${nextPage}`);
    params.set("pageSize", `${pageSize}`);
    return params.toString();
  };

  useEffect(() => {
    let active = true;
    const loadCandidates = async () => {
      setIsLoading(true);
      setError(null);
      setSaveError(null);
      try {
        const response = await fetch(`/api/candidates?${buildQuery(filters, page)}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const message =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load candidates.";
          setError(message);
          setCandidates([]);
          setTotalResults(0);
          return;
        }

        const list: Candidate[] = Array.isArray(payload?.candidates)
          ? payload.candidates
          : [];

        setCandidates(list);
        setTotalResults(typeof payload?.total === "number" ? payload.total : list.length);
        setSavedCandidateIds(
          new Set(list.filter((candidate) => candidate.isSaved).map((candidate) => candidate.id))
        );
      } catch (err) {
        console.error("Failed to load candidates", err);
        if (!active) return;
        setError("We couldn't reach the candidate service. Please try again.");
        setCandidates([]);
        setTotalResults(0);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadCandidates();
    return () => {
      active = false;
    };
  }, [filters, page]);

  const visibleCandidates = useMemo(() => {
    if (!showSavedOnly) return candidates;
    return candidates.filter((candidate) => savedCandidateIds.has(candidate.id));
  }, [candidates, savedCandidateIds, showSavedOnly]);

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  useEffect(() => {
    if (visibleCandidates.length === 0) {
      setSelectedCandidateId(null);
      return;
    }
    if (!selectedCandidateId || !visibleCandidates.some((c) => c.id === selectedCandidateId)) {
      setSelectedCandidateId(visibleCandidates[0].id);
    }
  }, [visibleCandidates, selectedCandidateId]);

  const selectedCandidate =
    (selectedCandidateId
      ? visibleCandidates.find((candidate) => candidate.id === selectedCandidateId)
      : visibleCandidates[0]) ?? null;

  const toggleSave = async (candidateId: string) => {
    const currentlySaved = savedCandidateIds.has(candidateId);
    setSavedCandidateIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
    setSaveError(null);

    try {
      const response = await fetch("/api/candidates/saved", {
        method: currentlySaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update saved candidate (${response.status})`);
      }
    } catch (err) {
      console.error("Failed to save candidate", err);
      setSaveError("We couldn't update saved candidates. Please try again.");
      setSavedCandidateIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) {
          next.add(candidateId);
        } else {
          next.delete(candidateId);
        }
        return next;
      });
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <div className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
            
                <h1 className="text-2xl font-semibold text-white">Search early-career talent</h1>
                <p className="text-sm text-white/70">
                  Browse the full candidate pool and save profiles that match your hiring needs.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="btn-outline-brand h-10 !border-white/60! text-white! hover:bg-white/10"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                  disabled={candidates.length === 0}
                >
                  {showSavedOnly ? "Show all" : "Show saved"}
                </Button>
                <Button
                  className="btn-outline-brand h-10 !border-white/60! text-white! hover:bg-white/10"
                  onClick={() => {
                    setDraftFilters(defaultFilters);
                    setFilters(defaultFilters);
                    setPage(1);
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Search"
                value={draftFilters.q}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, q: event.target.value }))
                }
                placeholder="Name, email, headline, skill"
                className="h-11 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
              <Input
                label="Location"
                value={draftFilters.location}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="City, state, or remote"
                className="h-11 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
              <Input
                label="Skills (comma separated)"
                value={draftFilters.skills}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, skills: event.target.value }))
                }
                placeholder="Excel, Modeling, Python"
                className="h-11 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
              <div className="flex flex-col gap-2">
                <label htmlFor="employment-type" className="text-sm font-medium text-white">
                  Employment type
                </label>
                <select
                  id="employment-type"
                  value={draftFilters.employmentType}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, employmentType: event.target.value }))
                  }
                  className="h-11 rounded-xl border border-white/40 bg-white/10 px-3 text-sm text-white outline-none focus:border-white"
                >
                  <option value="" className="text-black">
                    Any type
                  </option>
                  {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="text-black">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Years out (Undergrad min)"
                type="number"
                min="0"
                value={draftFilters.ugYearsOutMin}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, ugYearsOutMin: event.target.value }))
                }
                className="h-10 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
              <Input
                label="Years out (Undergrad max)"
                type="number"
                min="0"
                value={draftFilters.ugYearsOutMax}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, ugYearsOutMax: event.target.value }))
                }
                className="h-10 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
              <Input
                label="Years out (Grad min)"
                type="number"
                min="0"
                value={draftFilters.gradYearsOutMin}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, gradYearsOutMin: event.target.value }))
                }
                className="h-10 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
              <Input
                label="Years out (Grad max)"
                type="number"
                min="0"
                value={draftFilters.gradYearsOutMax}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, gradYearsOutMax: event.target.value }))
                }
                className="h-10 border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                className="btn-brand h-10 border border-white"
                onClick={() => {
                  setFilters(draftFilters);
                  setPage(1);
                }}
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search candidates"}
              </Button>
              <p className="text-sm text-white/70">
                {isLoading
                  ? "Loading candidates..."
                  : `${totalResults} candidate${totalResults === 1 ? "" : "s"} found`}
              </p>
            </div>

            {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
            {saveError ? <p className="mt-2 text-sm text-red-400">{saveError}</p> : null}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden md:flex-row">
          <aside
            className="w-full border-b md:w-96 md:max-w-sm md:shrink-0 md:border-b-0 md:border-r"
            style={{ borderColor: "var(--border)" }}
            aria-label="Candidate list"
          >
            <div className="h-full overflow-y-auto">
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {isLoading ? (
                  <li className="p-4 text-sm opacity-80">Loading candidates...</li>
                ) : visibleCandidates.length === 0 ? (
                  <li className="p-4 text-sm opacity-80">
                    {showSavedOnly
                      ? "No saved candidates match these filters."
                      : "No candidates match these filters."}
                  </li>
                ) : (
                  visibleCandidates.map((candidate) => {
                    const active = candidate.id === selectedCandidate?.id;
                    const saved = savedCandidateIds.has(candidate.id);
                    return (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCandidateId(candidate.id)}
                          className={`w-full p-4 text-left transition ${
                            active ? "bg-surface ring-1 ring-brandBlue" : "hover:bg-surface"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{candidate.name}</h3>
                              <p className="mt-1 text-sm opacity-90">
                                {candidate.headline ?? "No headline yet"}
                              </p>
                            </div>
                            {saved ? (
                              <span className="rounded-md bg-brandBlue px-2 py-0.5 text-xs text-white">
                                Saved
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs opacity-80">
                            {candidate.desiredLocation ?? "Location not specified"}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </aside>

          <section className="flex-1 overflow-y-auto p-6">
            {!selectedCandidate ? (
              <div className="card">Select a candidate to view their profile.</div>
            ) : (
              <article className="card-wide flex h-full flex-col gap-6">
                <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedCandidate.name}</h2>
                    <p className="opacity-90">
                      {selectedCandidate.headline ?? "No headline yet"}
                    </p>
                    <p className="text-sm opacity-80">
                      {selectedCandidate.desiredLocation
                        ? `Preferred location: ${selectedCandidate.desiredLocation}`
                        : "Location preference not provided."}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-white/70">
                      {selectedCandidate.yearsOutUndergrad !== null
                        ? `Undergrad: ${selectedCandidate.yearsOutUndergrad} yrs out`
                        : "Undergrad: N/A"}{" "}
                      {selectedCandidate.yearsOutGraduate !== null
                        ? `| Grad: ${selectedCandidate.yearsOutGraduate} yrs out`
                        : "| Grad: N/A"}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-sm opacity-90 md:items-end">
                    <span>{selectedCandidate.email ?? "Email unavailable"}</span>
                    <Button
                      type="button"
                      className={
                        savedCandidateIds.has(selectedCandidate.id)
                          ? "btn-brand h-10 bg-white text-[var(--brand)]"
                          : "btn-outline-brand h-10"
                      }
                      onClick={() => toggleSave(selectedCandidate.id)}
                    >
                      {savedCandidateIds.has(selectedCandidate.id) ? "Unsave" : "Save"}
                    </Button>
                  </div>
                </header>

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Skills
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCandidate.skills.length === 0 ? (
                      <p className="text-sm opacity-80">No skills added yet.</p>
                    ) : (
                      selectedCandidate.skills.map((skill) => (
                        <span
                          key={skill.name}
                          className="rounded-xl px-3 py-1 text-xs"
                          style={{ backgroundColor: "var(--brandBlue)", color: "#fff" }}
                        >
                          {skill.name}
                          {typeof skill.years === "number" ? ` • ${skill.years} yrs` : ""}
                        </span>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Experience
                  </h3>
                  {selectedCandidate.experiences.length === 0 ? (
                    <p className="text-sm opacity-80">No experience listed.</p>
                  ) : (
                    selectedCandidate.experiences.map((experience) => (
                      <div
                        key={experience.id}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">
                              {experience.title ?? "Role not specified"}
                            </p>
                            <p className="text-sm opacity-80">
                              {experience.company ?? "Company not specified"}
                            </p>
                          </div>
                          <p className="text-xs opacity-70">
                            {[formatDate(experience.startDate), formatDate(experience.endDate)]
                              .filter(Boolean)
                              .join(" - ") || "Timing not provided"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                          {experience.location ?? ""}
                          {experience.employmentType
                            ? ` • ${experience.employmentType}`
                            : ""}
                        </p>
                        {experience.description ? (
                          <p className="mt-3 text-sm opacity-90">{experience.description}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Education
                  </h3>
                  {selectedCandidate.degrees.length === 0 ? (
                    <p className="text-sm opacity-80">No education details listed.</p>
                  ) : (
                    selectedCandidate.degrees.map((degree) => (
                      <div
                        key={degree.id}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <p className="font-semibold">{degree.school ?? "School not specified"}</p>
                        <p className="text-sm opacity-80">
                          {[degree.degree, degree.field].filter(Boolean).join(" • ") ||
                            "Degree not specified"}
                        </p>
                        <p className="text-xs opacity-70">
                          {[formatDate(degree.startDate), formatDate(degree.endDate)]
                            .filter(Boolean)
                            .join(" - ") || "Dates not provided"}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              </article>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-foreground/70">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  className="btn-outline-brand h-9"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={isLoading || page <= 1}
                >
                  Prev
                </Button>
                <Button
                  className="btn-outline-brand h-9"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={isLoading || page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
