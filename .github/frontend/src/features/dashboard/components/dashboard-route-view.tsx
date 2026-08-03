import { BarChart02, Eye, FileCheck02, Users03 } from "@untitledui/icons";
import Hero from "@/assets/icons/hero.svg?react";
import { MetricsIcon02 } from "@/components/application/metrics/metrics";
import { Button } from "@/components/base/buttons/button";
import { useAuth } from "@/features/auth";

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
            <div className="flex items-center gap-5">
                <div>
                    <h2 className="text-2xl font-semibold text-primary">{isAuthenticated ? `Welkom terug, ${firstName}` : "Welkom"}</h2>
                    <p className="mt-1 text-tertiary capitalize">{formattedDate}</p>
                </div>
                <Hero className="text-primary" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <MetricsIcon02
                    title="In één oogopslag"
                    description="Bekijk een samenvatting van de begrotings- en jaarrekeingcijfers van de geselecteerde gemeente."
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
                    description="Bekijk een samenvatting van de begrotings- en jaarrekeingcijfers van de geselecteerde gemeente."
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
                    description="Bekijk een samenvatting van de begrotings- en jaarrekeingcijfers van de geselecteerde gemeente."
                    icon={<BarChart02 />}
                    footer={
                        <div className="flex gap-3">
                            <Button href="/baten" color="secondary">
                                Absoluut
                            </Button>
                            <Button href="/lasten">Per Inwoner</Button>
                        </div>
                    }
                />
            </div>
        </section>
    );
}
