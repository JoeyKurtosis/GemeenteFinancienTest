import { ArrowLeft, SearchLg } from "@untitledui/icons";
import NotFound from "@/assets/icons/not_found.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Illustration } from "@/components/shared-assets/illustrations";

export function NotFoundPage() {
    return (
        <section className="grid min-h-screen flex-1 bg-primary py-16 md:py-24">
            <div className="mx-auto grid h-full max-w-container grid-cols-1 items-center gap-8 px-4 md:grid-cols-2 md:px-8">
                <div className="flex h-full flex-1 flex-col items-start gap-8 md:justify-center md:gap-12 md:pr-8">
                    <div className="md:hidden">
                        <NotFound className="h-[200px] w-auto" />
                    </div>

                    <div className="flex flex-col items-start gap-4 md:gap-6">
                        <div className="flex flex-col gap-3">
                            <span className="text-md font-semibold text-brand-secondary">404</span>
                            <h1 className="text-display-md font-semibold text-primary md:text-display-lg lg:text-display-xl">Pagina niet gevonden</h1>
                        </div>
                        <p className="max-w-120 text-lg text-tertiary md:text-xl">
                            Sorry, de pagina die u zocht bestaat niet of is verplaats. Excuses voor het ongemak
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 self-stretch md:flex-row md:self-auto">
                        <Button size="xl" iconLeading={ArrowLeft} onPress={() => window.history.back()}>
                            Ga terug naar de vorige pagina
                        </Button>
                    </div>
                </div>

                <div className="relative hidden h-full flex-1 items-center justify-center px-14 md:flex">
                    <NotFound />
                </div>
            </div>
        </section>
    );
}
