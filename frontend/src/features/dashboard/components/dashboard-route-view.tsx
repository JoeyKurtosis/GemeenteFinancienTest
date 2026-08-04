import { ArrowRight, BarChart02, Eye, FileCheck02, Users03 } from "@untitledui/icons";
import Hero from "@/assets/icons/hero.svg?react";
import Kurtosis from "@/assets/icons/kurtosis.svg?react";
import { MetricsIcon02 } from "@/components/application/metrics/metrics";
import { Button } from "@/components/base/buttons/button";
import { useAuth } from "@/features/auth";
import { SignupCtaBanner } from "./signup-cta-banner";

export function DashboardRouteView() {
    const { user, isAuthenticated } = useAuth();
    const firstName = user?.first_name || user?.username || "daar";

    const formattedDate = new Intl.DateTimeFormat("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date());

    return (
        <section className="space-y-8">
            <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
                <div className="grid grid-cols-1 items-center gap-8 p-5 md:grid-cols-[auto_1fr] md:p-6 lg:gap-12">
                    {/* ── Hero ── */}
                    <div className="flex items-center justify-start">
                        <Hero className="h-64 w-auto text-primary md:h-72" />
                    </div>

                    {/* ── Content ── */}
                    <div className="flex min-w-0 flex-col gap-5">
                        <div>
                            <h2 className="text-xl font-semibold text-primary md:text-2xl">{isAuthenticated ? `Welkom terug, ${firstName}` : "Welkom"}</h2>
                            <p className="mt-1 text-sm text-tertiary capitalize">{formattedDate}</p>
                        </div>

                        <div className="flex max-w-prose flex-col gap-3 text-sm text-secondary">
                            <p>
                                Het Gemeentefinanciën dashboard biedt inzicht in de inkomsten en uitgaven van gemeenten in Nederland. Het bevat ook informatie
                                over gemeentelijke belastingen, schulden en woonlasten.
                            </p>
                            <p>
                                De gegevens zijn afkomstig van het CBS (Centraal Bureau voor de Statistiek) en worden jaarlijks bijgewerkt op basis van de
                                IV3-gegevens die gemeenten aanleveren.
                            </p>
                        </div>

                        <div className="flex max-w-prose flex-col gap-1">
                            <h3 className="text-sm font-semibold text-brand-secondary">Wat kun je hier vinden?</h3>
                            <p className="text-sm text-secondary">
                                Vergelijk begrotingen en jaarrekeningen, bekijk trends over meerdere jaren, en benchmark jouw gemeente tegen vergelijkbare
                                gemeenten.
                            </p>
                        </div>

                        <div>
                            <Button href="/over-ons" color="link-color" iconTrailing={ArrowRight}>
                                Lees meer
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-end gap-3 border-t border-secondary px-5 py-4">
                    <p className="text-sm text-tertiary">Ontwikkeld door</p>
                    <a href="https://www.kurtosis.nl/" target="_blank">
                        <Kurtosis className="h-5 w-auto" />
                    </a>
                </div>
            </div>

            {!isAuthenticated && <SignupCtaBanner />}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <MetricsIcon02
                    title="In één oogopslag"
                    description="Bekijk een samenvatting van de begrotings- en jaarrekeningcijfers van de geselecteerde gemeente."
                    icon={<Eye />}
                    footer={<Button href="/begroting">Per Inwoner</Button>}
                />
                <MetricsIcon02
                    title="Personele benchmark"
                    description="Bekijk en vergelijk de personeelsgerelateerde kosten van jouw gemeente en referentiegroep."
                    icon={<Users03 />}
                    footer={<Button href="/benchmark">Per Inwoner</Button>}
                />{" "}
                <MetricsIcon02
                    title="Begroting versus jaarrekening"
                    description="Bekijk een samenvatting van de begrotings- en jaarrekeningcijfers van de geselecteerde gemeente."
                    icon={<FileCheck02 />}
                    footer={
                        <div className="flex gap-3">
                            <Button href="/begroting/begroting-vs-jaarrekening-absolute-bedragen" color="secondary">
                                Absoluut
                            </Button>
                            <Button href="/begroting/begroting-vs-jaarrekening-per-inwoner">Per Inwoner</Button>
                        </div>
                    }
                />
                <MetricsIcon02
                    title="Verdiepende cijfers"
                    description="Bekijk een samenvatting van de begrotings- en jaarrekeningcijfers van de geselecteerde gemeente."
                    icon={<BarChart02 />}
                    footer={
                        <div className="flex gap-3">
                            <Button href="/baten" color="secondary">
                                Baten
                            </Button>
                            <Button href="/lasten">Lasten</Button>
                        </div>
                    }
                />
            </div>
        </section>
    );
}
