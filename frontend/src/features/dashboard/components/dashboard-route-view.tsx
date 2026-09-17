import { ArrowRight, LineChartUp03, PieChart03, PiggyBank01, Receipt, Scales02, Users03 } from "@untitledui/icons";
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
                        <Hero aria-hidden="true" className="h-64 w-auto text-primary md:h-72" />
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
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <MetricsIcon02
                    title="In één oogopslag"
                    description="De begroting van de geselecteerde gemeente samengevat: lasten, baten en saldo op hoofdlijnen."
                    icon={<PieChart03 />}
                    footer={<Button href="/in-een-oogopslag">Bekijken</Button>}
                />
                <MetricsIcon02
                    title="Personele benchmark"
                    description="Zet de personele lasten van jouw gemeente af tegen die van de gekozen referentiegroep."
                    icon={<Users03 />}
                    footer={<Button href="/benchmark">Bekijken</Button>}
                />
                <MetricsIcon02
                    title="Begroting versus jaarrekening"
                    description="Zie per taakveld waar de gerealiseerde bedragen afwijken van wat er begroot was."
                    icon={<Scales02 />}
                    footer={<Button href="/begroting-vs-jaarrekening">Bekijken</Button>}
                />
                <MetricsIcon02
                    title="Lasten"
                    description="De uitgaven van de gemeente uitgesplitst naar alle taakvelden, van sociaal domein tot veiligheid."
                    icon={<Receipt />}
                    footer={<Button href="/lasten">Bekijken</Button>}
                />
                <MetricsIcon02
                    title="Baten"
                    description="De inkomsten van de gemeente per bron: lokale heffingen, bijdragen van het Rijk en overige inkomsten."
                    icon={<PiggyBank01 />}
                    footer={<Button href="/baten">Bekijken</Button>}
                />
                <MetricsIcon02
                    title="Trends"
                    description="Volg de ontwikkeling van inkomsten, uitgaven en woonlasten over meerdere jaren."
                    icon={<LineChartUp03 />}
                    footer={<Button href="/trends">Bekijken</Button>}
                />
            </div>
            {/* ── Footer ── */}
            <div className="flex items-center justify-end gap-3 border-secondary px-5 py-4">
                <p className="text-sm text-tertiary">Ontwikkeld door</p>
                <a href="https://www.kurtosis.nl/" target="_blank" rel="noopener noreferrer" aria-label="Kurtosis – opent in een nieuw tabblad">
                    <Kurtosis aria-hidden="true" className="h-5 w-auto" />
                </a>
            </div>
        </section>
    );
}
