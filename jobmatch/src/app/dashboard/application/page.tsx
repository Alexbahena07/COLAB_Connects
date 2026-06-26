"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

const CAROUSEL_PHOTOS = [
  { src: "/photos/audience.jpg",  alt: "Audience at the Career Forum" },
  { src: "/photos/twoMen.JPG",    alt: "Two professionals networking at the Career Forum" },
  { src: "/photos/advisors.jpg",  alt: "Advisors at the Career Forum" },
];

function PhotoCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % CAROUSEL_PHOTOS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg"
      style={{ aspectRatio: "16 / 7" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {CAROUSEL_PHOTOS.map((photo, i) => (
        <div
          key={photo.src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1152px"
          />
        </div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {CAROUSEL_PHOTOS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const FAQS = [
  {
    question: "What is the deadline to apply?",
    answer: (
      <>
        <p>Applications close at 11:59 pm ET on Friday, September 12.</p>
        <p className="mt-2">Application review: September 12 – 18, 2025</p>
        <p className="mt-1">Applicants informed of status on or before: September 19, 2025</p>
      </>
    ),
  },
  {
    question: "Do I qualify for a travel stipend?",
    answer: <p>If you are arriving from outside the Tri-state area, you qualify.</p>,
  },
  {
    question: "How much is the travel stipend?",
    answer: (
      <p>
        The value of the travel stipend will range from $200–$700 based on the distance of
        travel and need. If you don&apos;t need a stipend to attend, please flag so that we are
        able to make this opportunity available for the maximum number of people.
      </p>
    ),
  },
  {
    question: "Is accommodation included?",
    answer: (
      <p>
        We also have a limited block of complimentary, shared rooms available on a first-come,
        first-served basis.
      </p>
    ),
  },
  {
    question: "What if I cannot attend in person?",
    answer: (
      <p>
        We encourage you to apply since your resume will be included in a resume book that will
        be sent to all participating firms.
      </p>
    ),
  },
];

export default function DashboardEventApplicationPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Hero */}
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-start">
            {/* Text */}
            <div className="flex-1">
              <span className="pill-brandBlue inline-flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                January 22, 2027
              </span>

              <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Career Forum</h1>

              <p className="mt-3 text-lg font-semibold text-foreground/90">
                The Industry-Leading Event to Recruit and Source the Next Generation of Talent in
                Finance
              </p>

              <p className="mt-5 text-sm leading-relaxed text-foreground/80">
                The headlines and studies on the gender gap in the alternative industry and the value
                of diversity are pervasive. The Career Forum provides a platform for young women and
                all first-generation college students and graduates an opportunity to learn, engage,
                and network with industry veterans, while efficiently helping employers solve the
                continued issue of finding qualified talent.
              </p>

              <a
                href="https://vimeo.com/1161539348?share=copy&fl=sv&fe=ci"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-white no-underline hover:opacity-90"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M8 5.5a1 1 0 0 1 1.514-.857l10 6a1 1 0 0 1 0 1.714l-10 6A1 1 0 0 1 8 17.5v-12Z" />
                </svg>
                Watch The Video
              </a>
            </div>

            {/* Photo */}
            <div className="w-full md:w-[480px] md:shrink-0">
              <Image
                src="/photos/groupPhoto.JPG"
                alt="Career Forum group photo"
                width={960}
                height={640}
                className="rounded-2xl object-cover shadow-lg"
                priority
              />
            </div>
          </div>
        </div>

        {/* Who should participate */}
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <h2 className="flex items-center gap-3 text-3xl font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" className="h-5 w-5">
                <circle cx="9" cy="7" r="3" />
                <path d="M3 20c0-3.3 2.7-6 6-6" />
                <circle cx="17" cy="7" r="3" />
                <path d="M21 20c0-3.3-2.7-6-6-6" />
                <path d="M12 14c-2 0-3.5.8-4.5 2" />
              </svg>
            </span>
            Who should participate?
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="flex w-full flex-col rounded-2xl bg-brandBlue p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5">
                    <rect x="4" y="7" width="16" height="11" rx="2" />
                    <path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7" />
                    <path d="M8 12h8M8 15h4" />
                  </svg>
                </span>
                <h3 className="text-xl font-bold text-white">Professionals</h3>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/90">
                Professionals from organizations within the alternative investment industry,
                including private equity, venture capital, real estate, credit, real assets,
                hedge funds, and investment banks, who are seeking to recruit and network with
                enthusiastic, qualified, and highly educated next-generation talent.
              </p>
              <a
                href="https://www.colabconnects.org/_files/ugd/2cb084_174fc05265244e96a5f42916247af6de.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-white no-underline transition hover:opacity-90"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6M10 12h4M10 16h4M10 8h1" />
                </svg>
                Prior event brochure (2025)
              </a>
            </div>

            <div className="flex w-full flex-col rounded-2xl bg-brandBlue p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5">
                    <path d="M22 10c-5 0-8-2-10-5C10 8 7 10 2 10" />
                    <path d="M6 10v2a6 6 0 0 0 12 0v-2" />
                    <path d="M12 22v-4" />
                    <path d="M9 22h6" />
                  </svg>
                </span>
                <h3 className="text-xl font-bold text-white">Forum Scholars</h3>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/90">
                Undergraduate through 3 years post-graduate school, including analysts and
                associates from alternative investment firms, investment banks, and management
                consulting firms, accountants, attorneys, operators, and marketing professionals.
                All Forum Scholars will be pre-screened.
              </p>
              <a
                href="https://form.jotform.com/261656866237166"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-white no-underline transition hover:opacity-90"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Apply
              </a>
            </div>
          </div>
        </div>

        {/* Photo carousel */}
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <PhotoCarousel />
        </div>

        {/* FAQs */}
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <h2 className="flex items-center gap-3 text-3xl font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" className="h-5 w-5">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2.5-2.5 4" />
                <circle cx="12" cy="17" r=".5" fill="var(--brand)" />
              </svg>
            </span>
            FAQs for applicants
          </h2>

          <div className="mt-6 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl bg-brand p-4"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 text-base font-semibold text-white">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  {faq.question}
                </summary>
                <div className="mt-3 pl-7 text-sm leading-relaxed text-white/85">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
        {/* Location */}
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <h2 className="flex items-center gap-3 text-3xl font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" className="h-5 w-5">
                <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6Z" />
                <circle cx="12" cy="8" r="2" />
              </svg>
            </span>
            Location
          </h2>
          <p className="mt-2 text-sm text-muted">New York City, NY</p>

          <div className="mt-6 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
            <iframe
              title="New York City map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d193595.1583091352!2d-74.11976373946234!3d40.69766374874431!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY!5e0!3m2!1sen!2sus!4v1749000000000!5m2!1sen!2sus"
              width="100%"
              height="420"
              style={{ border: 0, display: "block" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
