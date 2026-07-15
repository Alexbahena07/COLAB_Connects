"use client";

import { useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
type CandidateCertificate = {
  id: string;
  name: string | null;
  issuer: string | null;
  issuedAt: string | null;
  expirationDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  headline: string | null;
  desiredLocation: string | null;
  openToWork: boolean;
  resumeFileName: string | null;
  resumeUrl: string | null;
  skills: CandidateSkill[];
  degrees: CandidateDegree[];
  certificates: CandidateCertificate[];
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

export default function CandidatesPageClient() {
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFieldFilterCount = [
    draftFilters.q.trim() !== "",
    draftFilters.location.trim() !== "",
    draftFilters.skills.trim() !== "",
    draftFilters.employmentType !== "",
    draftFilters.ugYearsOutMin.trim() !== "",
    draftFilters.ugYearsOutMax.trim() !== "",
    draftFilters.gradYearsOutMin.trim() !== "",
    draftFilters.gradYearsOutMax.trim() !== "",
  ].filter(Boolean).length;

  const getInitials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  return (
      <main className="flex flex-1 flex-col bg-background text-foreground md:min-h-0 md:overflow-hidden">

        {/* Filter bar */}
        <div className="shrink-0 border-b border-brand/10 bg-brand/5">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-brand">Search early-career talent</h1>
                <p className="text-sm text-muted">
                  Browse the full candidate pool and save profiles that match your hiring needs.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                  disabled={candidates.length === 0}
                >
                  {showSavedOnly ? "Show all" : "Show saved"}
                </Button>
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => { setDraftFilters(defaultFilters); setFilters(defaultFilters); setPage(1); }}
                >
                  Reset filters
                </Button>
              </div>
            </div>

            {/* Filters toggle — mobile only. Keeps the filter fields out of the
                way by default so the candidate list gets more vertical space. */}
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground md:hidden"
            >
              <span className="flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                  <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
                </svg>
                Filters
                {activeFieldFilterCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                    {activeFieldFilterCount}
                  </span>
                ) : null}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div className={`mt-4 gap-4 md:mt-6 md:grid md:grid-cols-2 lg:grid-cols-4 ${filtersOpen ? "grid" : "hidden"}`}>
              <Input
                label="Search"
                value={draftFilters.q}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, q: event.target.value }))}
                placeholder="Name, email, headline, skill"
                className="h-11 border-border bg-background text-foreground placeholder:text-muted"
              />
              <Input
                label="Location"
                value={draftFilters.location}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="City, state, or remote"
                className="h-11 border-border bg-background text-foreground placeholder:text-muted"
              />
              <Input
                label="Skills (comma separated)"
                value={draftFilters.skills}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, skills: event.target.value }))}
                placeholder="Excel, Modeling, Python"
                className="h-11 border-border bg-background text-foreground placeholder:text-muted"
              />
              <div className="flex flex-col gap-2">
                <label htmlFor="employment-type" className="text-sm font-medium text-foreground">
                  Employment type
                </label>
                <select
                  id="employment-type"
                  value={draftFilters.employmentType}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, employmentType: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
                >
                  <option value="">Any type</option>
                  {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`mt-4 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 ${filtersOpen ? "grid" : "hidden"}`}>
              <Input
                label="Undergrad yrs out (min)"
                type="number" min="0"
                value={draftFilters.ugYearsOutMin}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, ugYearsOutMin: event.target.value }))}
                className="h-10 border-border bg-background text-foreground placeholder:text-muted"
              />
              <Input
                label="Undergrad yrs out (max)"
                type="number" min="0"
                value={draftFilters.ugYearsOutMax}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, ugYearsOutMax: event.target.value }))}
                className="h-10 border-border bg-background text-foreground placeholder:text-muted"
              />
              <Input
                label="Grad yrs out (min)"
                type="number" min="0"
                value={draftFilters.gradYearsOutMin}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, gradYearsOutMin: event.target.value }))}
                className="h-10 border-border bg-background text-foreground placeholder:text-muted"
              />
              <Input
                label="Grad yrs out (max)"
                type="number" min="0"
                value={draftFilters.gradYearsOutMax}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, gradYearsOutMax: event.target.value }))}
                className="h-10 border-border bg-background text-foreground placeholder:text-muted"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                className="btn-brand h-10"
                onClick={() => { setFilters(draftFilters); setPage(1); }}
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search candidates"}
              </Button>
              <p className="text-sm text-muted">
                {isLoading
                  ? "Loading candidates..."
                  : `${totalResults} candidate${totalResults === 1 ? "" : "s"} found`}
              </p>
            </div>

            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
            {saveError ? <p className="mt-1 text-xs text-red-600">{saveError}</p> : null}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 md:min-h-0 md:flex-row md:overflow-hidden">

          {/* Candidate sidebar */}
          <aside
            className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-brandBlue md:max-h-none md:min-h-0 md:w-96 md:max-w-sm"
            aria-label="Candidate list"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y divide-white/10">
                {isLoading ? (
                  <li className="p-4 text-sm text-white/70">Loading candidates...</li>
                ) : visibleCandidates.length === 0 ? (
                  <li className="p-4 text-sm text-white/70">
                    {showSavedOnly ? "No saved candidates match these filters." : "No candidates match these filters."}
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
                          className={`group w-full p-4 text-left transition ${
                            active
                              ? "border-l-4 border-l-white bg-white/20"
                              : "border-l-4 border-l-transparent hover:border-l-white hover:bg-brand"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {candidate.photoUrl ? (
                                <img
                                  src={candidate.photoUrl}
                                  alt={candidate.name}
                                  className={`h-10 w-10 shrink-0 rounded-xl border object-cover transition ${
                                    active ? "border-white/60" : "border-white/30 group-hover:border-white/60"
                                  }`}
                                />
                              ) : (
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                                  active
                                    ? "border-white/60 bg-white/25 text-white"
                                    : "border-white/30 bg-white/15 text-white group-hover:border-white/60 group-hover:bg-white/25"
                                }`}>
                                  {getInitials(candidate.name)}
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-white">{candidate.name}</h3>
                                <p className="mt-0.5 text-xs text-white/70 group-hover:text-white/85">
                                  {candidate.headline ?? "No headline yet"}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {saved ? (
                                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                                  Saved
                                </span>
                              ) : null}
                              {candidate.openToWork ? (
                                <span className="rounded-md bg-emerald-400/25 px-2 py-0.5 text-xs font-medium text-emerald-50">
                                  Open to work
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-white/55 group-hover:text-white/70">
                            {candidate.desiredLocation ?? "Location not specified"}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* Pagination inside sidebar footer */}
            {totalPages > 1 ? (
              <div className="shrink-0 border-t border-white/10 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/60">Page {page} of {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={isLoading || page <= 1}
                    >
                      Prev
                    </Button>
                    <Button
                      className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={isLoading || page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>

          {/* Detail panel */}
          <section className="w-full flex-1 rounded-2xl bg-background md:min-h-0 md:overflow-hidden">
            {!selectedCandidate ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Select a candidate to view their profile.
              </div>
            ) : (
              <div className="flex h-full flex-col lg:flex-row">

                {/* LEFT — scrollable main content */}
                <div className="min-h-0 flex-1 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
                  <div className="flex items-start gap-4">
                    {selectedCandidate.photoUrl ? (
                      <img
                        src={selectedCandidate.photoUrl}
                        alt={selectedCandidate.name}
                        className="h-14 w-14 shrink-0 rounded-xl border border-brandBlue/40 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brandBlue/40 bg-brandBlue/10 text-sm font-semibold text-brandBlue">
                        {getInitials(selectedCandidate.name)}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-foreground">{selectedCandidate.name}</h2>
                        {selectedCandidate.openToWork ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Open to work
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{selectedCandidate.headline ?? "No headline yet"}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Skills</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCandidate.skills.length === 0 ? (
                        <p className="text-sm text-muted">No skills added yet.</p>
                      ) : (
                        selectedCandidate.skills.map((skill) => (
                          <span
                            key={skill.name}
                            className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-semibold text-brandBlue"
                          >
                            {skill.name}
                            {typeof skill.years === "number" ? ` • ${skill.years} yrs` : ""}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Experience</h3>
                    {selectedCandidate.experiences.length === 0 ? (
                      <p className="text-sm text-muted">No experience listed.</p>
                    ) : (
                      selectedCandidate.experiences.map((experience) => (
                        <div key={experience.id} className="rounded-xl border border-border bg-surface p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{experience.title ?? "Role not specified"}</p>
                              <p className="text-sm text-muted">{experience.company ?? "Company not specified"}</p>
                            </div>
                            <p className="shrink-0 text-xs text-muted">
                              {[formatDate(experience.startDate), formatDate(experience.endDate)].filter(Boolean).join(" – ") || "Timing not provided"}
                            </p>
                          </div>
                          {(experience.location || experience.employmentType) ? (
                            <p className="mt-1 text-xs text-muted">
                              {[experience.location, experience.employmentType].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                          {experience.description ? (
                            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{experience.description}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Education</h3>
                    {selectedCandidate.degrees.length === 0 ? (
                      <p className="text-sm text-muted">No education details listed.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedCandidate.degrees.map((degree) => (
                          <div key={degree.id} className="rounded-xl border border-border bg-surface p-4">
                            <p className="font-semibold text-brand">{degree.school ?? "School not specified"}</p>
                            <p className="text-sm text-muted">
                              {[degree.degree, degree.field].filter(Boolean).join(" · ") || "Degree not specified"}
                            </p>
                            <p className="mt-1 text-xs text-muted/70">
                              {[formatDate(degree.startDate), formatDate(degree.endDate)].filter(Boolean).join(" – ") || "Dates not provided"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Certificates</h3>
                    {selectedCandidate.certificates.length === 0 ? (
                      <p className="text-sm text-muted">No certificates listed.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedCandidate.certificates.map((certificate) => (
                          <div key={certificate.id} className="rounded-xl border border-border bg-surface p-4">
                            <p className="font-semibold text-brand">
                              {certificate.credentialUrl ? (
                                <a
                                  href={certificate.credentialUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline underline-offset-4 hover:opacity-80"
                                >
                                  {certificate.name ?? "Certificate"}
                                </a>
                              ) : (
                                certificate.name ?? "Certificate"
                              )}
                            </p>
                            <p className="text-sm text-muted">{certificate.issuer ?? "Issuer not specified"}</p>
                            <p className="mt-1 text-xs text-muted/70">
                              {[formatDate(certificate.issuedAt), formatDate(certificate.expirationDate)]
                                .filter(Boolean)
                                .join(" – ") || "Dates not provided"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT — sticky sidebar */}
                <div className="w-full shrink-0 p-6 lg:w-72 lg:overflow-y-auto">
                  <div className="space-y-4 lg:sticky lg:top-6">
                    <Button
                      type="button"
                      className="btn-brand w-full h-11"
                      onClick={() => toggleSave(selectedCandidate.id)}
                    >
                      {savedCandidateIds.has(selectedCandidate.id) ? "Unsave" : "Save candidate"}
                    </Button>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Contact</h3>
                      <p className="mt-2 break-all text-sm text-foreground">
                        {selectedCandidate.email ?? "Email unavailable"}
                      </p>
                      {selectedCandidate.desiredLocation ? (
                        <p className="mt-1 text-sm text-muted">{selectedCandidate.desiredLocation}</p>
                      ) : null}
                      {selectedCandidate.resumeUrl ? (
                        <a
                          href={selectedCandidate.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-outline-brand mt-3 inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs"
                        >
                          View resume
                        </a>
                      ) : (
                        <p className="mt-3 text-xs text-muted">No resume uploaded</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Experience level</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-foreground">
                          {selectedCandidate.yearsOutUndergrad !== null
                            ? `Undergrad: ${selectedCandidate.yearsOutUndergrad} yr${selectedCandidate.yearsOutUndergrad === 1 ? "" : "s"} out`
                            : "Undergrad: N/A"}
                        </p>
                        <p className="text-sm text-foreground">
                          {selectedCandidate.yearsOutGraduate !== null
                            ? `Grad: ${selectedCandidate.yearsOutGraduate} yr${selectedCandidate.yearsOutGraduate === 1 ? "" : "s"} out`
                            : "Grad: N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </section>
        </div>
      </main>
  );
}
