export function OverOnsRouteView() {
    return (
        <section className="space-y-10">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <div className="flex flex-col gap-6">
                    <h2 className="text-display-xs font-semibold text-primary md:text-display-sm">Inzicht in gemeentelijke financiën</h2>

                    <div className="flex flex-col gap-4 text-md text-tertiary">
                        <p>
                            Het Gemeentefinanciën dashboard biedt helder inzicht in de inkomsten en uitgaven van gemeenten in Nederland. Het bevat informatie
                            over gemeentelijke belastingen, schulden en woonlasten — alles op één plek.
                        </p>
                        <p>
                            De gegevens zijn afkomstig van het CBS (Centraal Bureau voor de Statistiek) en worden jaarlijks bijgewerkt op basis van de
                            IV3-gegevens die gemeenten aanleveren. Hierdoor is het dashboard altijd actueel en betrouwbaar.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-md font-semibold text-primary">Wat kun je hier doen?</h3>
                        <ul className="flex flex-col gap-2 text-sm text-tertiary">
                            <li className="flex items-start gap-2">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
                                Begrotingen en jaarrekeningen vergelijken
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
                                Trends bekijken over meerdere jaren
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
                                Jouw gemeente benchmarken tegen vergelijkbare gemeenten
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
                                Verdiepende cijfers inzien voor baten en lasten
                            </li>
                        </ul>
                    </div>
                </div>

                <img src="./denhaag.jpg" alt="denhaag" className="max-h-125 w-auto w-full rounded-xl" />
            </div>
        </section>
    );
}
