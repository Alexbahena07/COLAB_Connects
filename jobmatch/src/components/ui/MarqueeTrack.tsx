"use client";

import Image from "next/image";

const SPONSORS = [
  { name: "1315 Capital",                      src: "/Sponsors/1315-capital.jpg" },
  { name: "50 South Capital",                  src: "/Sponsors/50-south-capital.jpg" },
  { name: "A1A Investment Partners",           src: "/Sponsors/a1a-investment-partners.jpg" },
  { name: "AltFinance",                        src: "/Sponsors/altfinance.jpg" },
  { name: "Ares",                              src: "/Sponsors/ares.jpg" },
  { name: "BlackRock",                         src: "/Sponsors/blackrock.jpg" },
  { name: "Blackstone",                        src: "/Sponsors/blackstone.jpg" },
  { name: "Browning West",                     src: "/Sponsors/browningwest.jpg" },
  { name: "Carta",                             src: "/Sponsors/carta.jpg" },
  { name: "Citco",                             src: "/Sponsors/citco.jpg" },
  { name: "Clubb Search",                      src: "/Sponsors/clubb-search.jpg" },
  { name: "Coalesce Capital",                  src: "/Sponsors/coalesce-capital.jpg" },
  { name: "Fin News",                          src: "/Sponsors/fin-news.jpg" },
  { name: "Global Female Investors Management",src: "/Sponsors/global-female-investors-management.jpg" },
  { name: "GP Fund Solutions",                 src: "/Sponsors/gp-fund-solutions.jpg" },
  { name: "Granger Management",               src: "/Sponsors/granger-management.jpg" },
  { name: "Healthbridge Innovation Partners", src: "/Sponsors/healthbridge-innovation-partners.jpg" },
  { name: "Hunter Creek",                      src: "/Sponsors/hunter-creek.jpg" },
  { name: "IMB Partners",                      src: "/Sponsors/imb-partners.jpg" },
  { name: "Kinzie Capital Partners",           src: "/Sponsors/kinzie-capital-partners.jpg" },
  { name: "Neuberger Berman",                  src: "/Sponsors/neuberger-berman.jpg" },
  { name: "Paradigm Global Investors",         src: "/Sponsors/paradigm-global-investors.jpg" },
  { name: "Parker Dewey",                      src: "/Sponsors/parker-dewey.jpg" },
  { name: "Paul Hastings",                     src: "/Sponsors/paul-hastings.jpg" },
  { name: "Paul Weiss",                        src: "/Sponsors/paul-weiss.jpg" },
  { name: "PE WIN",                            src: "/Sponsors/pe-win.jpg" },
  { name: "Peak Rock Capital",                 src: "/Sponsors/peak-rock-capital.jpg" },
  { name: "Rock the Street Wall Street",       src: "/Sponsors/rock-the-street-wall-street.jpg" },
  { name: "Seven Generations Capital",         src: "/Sponsors/seven-generations-capital.jpg" },
  { name: "SSEC",                              src: "/Sponsors/ssec.jpg" },
  { name: "Stellex Capital Management",        src: "/Sponsors/stellex-capital-management.jpg" },
  { name: "Tavo",                              src: "/Sponsors/tavo.jpg" },
  { name: "The Academy Group",                 src: "/Sponsors/the-academy-group.jpg" },
  { name: "Varde Partners",                    src: "/Sponsors/varde-partners.jpg" },
  { name: "Wind Point Partners",               src: "/Sponsors/wind-point-partners.jpg" },
];

export default function MarqueeTrack() {
  return (
    <div className="overflow-hidden">
      <div
        className="flex w-max gap-6"
        style={{ animation: "marquee 40s linear infinite" }}
        onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
        onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
      >
        {[0, 1].flatMap((copy) =>
          SPONSORS.map((sponsor) => (
            <div
              key={`${copy}-${sponsor.name}`}
              className="flex w-48 shrink-0 items-center justify-center rounded-xl border border-black/8 bg-white px-5 py-4 shadow-sm"
            >
              <div className="relative h-12 w-full">
                <Image
                  src={sponsor.src}
                  alt={`${sponsor.name} logo`}
                  fill
                  sizes="192px"
                  className="object-contain"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
