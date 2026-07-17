import { Anchor } from "@/components/base/anchor/anchor";

export function VerantwoordingRouteView() {
    return (
        <section className="space-y-8">
            <div className="max-w-prose">
                <p className="mb-3 font-semibold">Verantwoording</p>
                <p>
                    De financiële gegevens komen uit de lvl3-datasets, gepubliceerd door het CBS. Tenzij anders aangegeven, gaat het om cijfers vanuit de tweede
                    plaatsing. De uitlegteksten over taakvelden zijn afkomstig van{" "}
                    <Anchor href="https://findo.nl" target="_blank" rel="noopener noreferrer">
                        Findo
                    </Anchor>
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Baten */}
                <div className="rounded-xl border border-secondary p-6">
                    <h2 className="mb-4 text-lg font-semibold text-primary">Baten</h2>

                    <div className="space-y-5">
                        <div>
                            <h3 className="font-semibold text-primary">Rijk</h3>
                            <p className="text-secondary">Alle baten in:</p>
                            <ul className="mt-1 list-inside list-disc text-secondary">
                                <li>Categorie 4.3.1 - Inkomensoverdracht - Rijk.</li>
                            </ul>
                            <p className="mt-1 text-secondary">SPUKS: alles behalve taakveld 0.7</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-primary">Lokale heffingen</h3>

                            <div className="mt-2 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-secondary">Onroerendezaakbelasting:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 2.2.1 - Belastingen op producenten óf</li>
                                        <li>Categorie 2.2.2 - Belastingen op huishoudens, én</li>
                                        <li>Taakveld 0.61 - OZB woningen óf</li>
                                        <li>Taakveld 0.62 - OZB niet-woningen.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Afvalheffing:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 3.7 - Leges en andere rechten én</li>
                                        <li>Taakveld 7.3 - Afval.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Rioolheffing:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 2.2.1 - Belastingen op producenten óf</li>
                                        <li>Categorie 2.2.2 - Belastingen op huishoudens, én</li>
                                        <li>Taakveld 7.2 - Riolering.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Parkeerbelasting:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 3.7 - Leges en andere rechten én</li>
                                        <li>Taakveld 0.63 - Parkeerbelasting.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Overige belastingen en leges:</h4>
                                    <p className="text-secondary">Alle baten, minus bovenstaand genoemde lokale heffingen, in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 2.2.1 - Belastingen op producenten óf</li>
                                        <li>Categorie 2.2.2 - Belastingen op huishoudens óf</li>
                                        <li>Categorie 3.7 - Leges en andere rechten.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Baten (vervolg) */}
                <div className="rounded-xl border border-secondary p-6">
                    <h2 className="mb-4 text-lg font-semibold text-primary">Baten (vervolg)</h2>

                    <div className="space-y-5">
                        <div>
                            <h3 className="font-semibold text-primary">Overige inkomsten</h3>

                            <div className="mt-2 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-secondary">Bijdragen uit reserves:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 7.1 - Mutatie reserves én</li>
                                        <li>Taakveld 0.1 - Bestuur.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Inkomsten uit grond:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 3.1 - Grond.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Huren en pachten:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 3.3 - Pachten óf</li>
                                        <li>Categorie 3.6 - Huren.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Rente, dividenden en winsten:</h4>
                                    <p className="text-secondary">Alle baten in:</p>
                                    <ul className="mt-1 list-inside list-disc text-tertiary">
                                        <li>Categorie 5.1 - Rente óf</li>
                                        <li>Categorie 5.2 - Dividenden en winsten.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-secondary">Overige inkomsten:</h4>
                                    <p className="text-secondary">Alle overige baten.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
