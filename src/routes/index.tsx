import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CakeSlice,
  Coffee,
  Hotel,
  Menu as MenuIcon,
  QrCode,
  Store,
  Utensils,
  X,
} from "lucide-react";
import { PROTOTYPE_DIRECTORY_MENUS, PROTOTYPE_DIRECTORY_VENUES } from "@/lib/pewa/fixtures";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PEWA — Your menu deserves to be seen" },
      {
        name: "description",
        content:
          "Put your menu online, keep it up to date, and make it easy for customers to discover what you offer.",
      },
      { property: "og:title", content: "PEWA — Your menu deserves to be seen" },
      {
        property: "og:description",
        content: "Make your menu easy to find, share and explore with PEWA. Ordering is optional.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

// These are explicitly illustrative fixture snapshots, never linked to a menu route.
// Current publication eligibility is evaluated by the Directory and menu resolver.
const menuPreviews = PROTOTYPE_DIRECTORY_VENUES.flatMap((business) => {
  const sampleMenu = PROTOTYPE_DIRECTORY_MENUS.find(
    (candidate) =>
      candidate.venueId === business.id &&
      candidate.status === "published" &&
      !candidate.isProtected,
  );
  const offering = sampleMenu?.sections.flatMap((section) => section.offerings)[0];
  return sampleMenu && offering ? [{ business, menu: sampleMenu, offering }] : [];
}).slice(0, 4);
const heroPreview = menuPreviews[0];

const audiences = [
  {
    title: "Restaurants & cafés",
    description: "Give diners an easy way to discover your food, drinks and menus.",
    icon: Utensils,
    image: menuPreviews[0]?.offering.image,
    imageAlt: menuPreviews[0]?.offering.name || "A demonstration café menu offering",
  },
  {
    title: "Hotels & hospitality",
    description: "Present dining, bar and room-service menus in the right guest context.",
    icon: Hotel,
    image: menuPreviews[1]?.offering.image,
    imageAlt: menuPreviews[1]?.offering.name || "A demonstration hospitality menu offering",
  },
  {
    title: "Bakeries",
    description: "Showcase baked goods, daily offerings and seasonal selections.",
    icon: CakeSlice,
    image: menuPreviews[3]?.offering.image,
    imageAlt: menuPreviews[3]?.offering.name || "A demonstration bakery menu offering",
  },
  {
    title: "Delivery kitchens",
    description: "Make your offerings discoverable without needing a physical storefront.",
    icon: Store,
    image: menuPreviews[2]?.offering.image,
    imageAlt: menuPreviews[2]?.offering.name || "A demonstration delivery kitchen offering",
  },
];

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="overflow-hidden bg-background">
      <header className="relative z-10 border-b border-primary/10 bg-card">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="PEWA home" className="inline-flex shrink-0 items-center">
            <img src="/pewa-horizontal-cropped.png" alt="PEWA" className="h-auto w-32 sm:w-36" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            <Link
              to="/discover"
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              Explore Menus
            </Link>
            <a
              href="#for-business"
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              For Business
            </a>
            <Link to="/admin" className="text-sm font-semibold text-foreground hover:text-primary">
              Business Workspace
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Get Started
            </Link>
          </nav>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-main-navigation"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-full border-b bg-card p-4 shadow-lg md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link
                to="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-muted"
              >
                Explore Menus
              </Link>
              <a
                href="#for-business"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-muted"
              >
                For Business
              </a>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-muted"
              >
                Business Workspace
              </Link>
              <Link
                to="/onboarding"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                Get Your Business Started
              </Link>
            </div>
          </nav>
        )}
      </header>

      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-12 lg:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="max-w-xl text-xs font-bold leading-5 tracking-[0.12em] text-primary sm:text-sm">
              FOR RESTAURANTS, CAFÉS, HOTELS, BAKERIES &amp; DELIVERY KITCHENS
            </p>
            <h1 className="mt-5 max-w-xl text-[2.65rem] font-bold leading-[1.04] tracking-tight text-primary sm:text-6xl lg:text-7xl">
              Your menu deserves to be seen.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Put your menu online, keep it up to date, and make it easy for customers to discover
              what you offer. Share it with QR codes and links, or let customers find you on PEWA.
              Add ordering when it works for your business.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/onboarding"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Get Your Business Started
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/discover"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/30 bg-card px-6 text-sm font-bold text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Explore Menus
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem]">
            <div className="absolute -right-8 -top-7 h-36 w-36 rounded-full bg-accent/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-7 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
            <div className="relative rounded-[1.75rem] bg-primary p-3 shadow-xl sm:p-5">
              <div className="overflow-hidden rounded-2xl bg-card">
                <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                      <Coffee aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {heroPreview?.business.name || "PEWA demonstration business"}
                      </p>
                      <p className="text-xs text-muted-foreground">Illustrative menu preview</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary sm:text-xs">
                    DEMONSTRATION
                  </span>
                </div>

                <div className="relative aspect-[1.55] overflow-hidden bg-secondary">
                  {heroPreview?.offering.image ? (
                    <img
                      src={heroPreview.offering.image}
                      alt={heroPreview.offering.name + " from a demonstration menu"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-full items-center justify-center text-6xl"
                    >
                      ☕
                    </div>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-primary shadow">
                    Demonstration menu preview
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {heroPreview?.menu.name || "Sample menu"}
                      </p>
                      <p className="mt-1 font-display text-xl font-bold text-foreground">
                        {heroPreview?.offering.name || "A sample offering"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {heroPreview?.offering.description ||
                          "An example from a PEWA menu preview."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-secondary px-2 py-1.5 text-xs font-bold text-primary">
                      {heroPreview?.business.currency || "KES"}{" "}
                      {heroPreview?.offering.price?.toLocaleString() || "—"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 pt-3 text-xs font-medium text-muted-foreground">
                    <QrCode aria-hidden="true" className="h-4 w-4 text-accent" />
                    Open from a link or QR code
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="for-business" className="scroll-mt-8 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-accent">A simple path to a shareable menu</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
              Make your menu easy to find, share and explore.
            </h2>
          </div>
          <ol className="mt-9 grid gap-6 md:grid-cols-3 md:gap-8">
            <li className="rounded-2xl bg-background p-5 sm:p-6">
              <span className="text-sm font-bold text-accent">01</span>
              <h3 className="mt-3 text-xl font-bold text-foreground">Create your presence</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Add your business, locations and service points.
              </p>
            </li>
            <li className="rounded-2xl bg-background p-5 sm:p-6">
              <span className="text-sm font-bold text-primary">02</span>
              <h3 className="mt-3 text-xl font-bold text-foreground">Publish your menus</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Organise your offerings, set prices and keep menus up to date.
              </p>
            </li>
            <li className="rounded-2xl bg-background p-5 sm:p-6">
              <span className="text-sm font-bold text-primary">03</span>
              <h3 className="mt-3 text-xl font-bold text-foreground">Reach more customers</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Share through QR codes and links, and be discoverable on PEWA.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-accent">One platform, many food businesses</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
            Made for the many ways people enjoy food.
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {audiences.map(({ title, description, icon: Icon, image, imageAlt }, index) => (
            <article key={title} className="min-w-0">
              {image ? (
                <img
                  src={image}
                  alt={imageAlt}
                  loading="lazy"
                  className="mb-3 aspect-[1.55] w-full rounded-xl object-cover sm:mb-4"
                />
              ) : null}
              <span
                className={
                  "flex h-11 w-11 items-center justify-center rounded-xl " +
                  (index === 0 || index === 3
                    ? "bg-secondary text-primary"
                    : "bg-accent/15 text-accent")
                }
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-bold text-foreground sm:mt-4 sm:text-lg">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-9 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
          <div className="max-w-lg">
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              See PEWA from your customer&apos;s side.
            </h2>
            <p className="mt-4 text-sm leading-6 text-primary-foreground/80 sm:text-base sm:leading-7">
              Discover how customers can find businesses, browse available menus and access
              offerings through QR codes or shared links. Examples here are demonstrations; the
              Directory shows current menu availability.
            </p>
            <Link
              to="/directory"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-card px-5 text-sm font-bold text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-card focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Explore the Directory
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {menuPreviews.map(({ business, menu: sampleMenu, offering }) => {
              return (
                <article
                  key={business.id}
                  className="min-w-0 overflow-hidden rounded-xl bg-card text-foreground shadow-sm"
                >
                  {offering.image ? (
                    <img
                      src={offering.image}
                      alt={offering.name + " from " + business.name + " demonstration menu"}
                      loading="lazy"
                      className="aspect-[1.75] w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex aspect-[1.75] items-center justify-center bg-secondary text-3xl"
                      aria-hidden="true"
                    >
                      {offering.emoji || "🍽️"}
                    </div>
                  )}
                  <div className="p-3">
                    <span className="text-[9px] font-bold tracking-wide text-accent">
                      DEMONSTRATION · MENU PREVIEW
                    </span>
                    <p className="mt-1 truncate text-sm font-bold">{business.name}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-foreground">
                      {offering.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {business.category} · {sampleMenu.name}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between md:py-14 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight text-primary sm:text-4xl">
              Ready to make your menu easier to discover?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Create your business presence on PEWA and start sharing what you offer.
            </p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Get Your Business Started
            <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link to="/" aria-label="PEWA home" className="inline-flex w-fit items-center">
            <img src="/pewa-horizontal-cropped.png" alt="PEWA" className="h-auto w-28" />
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/discover" className="font-semibold text-muted-foreground hover:text-primary">
              Explore Menus
            </Link>
            <Link
              to="/directory"
              className="font-semibold text-muted-foreground hover:text-primary"
            >
              Directory
            </Link>
            <Link to="/scan" className="font-semibold text-muted-foreground hover:text-primary">
              Scan a Menu
            </Link>
            <Link
              to="/onboarding"
              className="font-semibold text-muted-foreground hover:text-primary"
            >
              For Business
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
