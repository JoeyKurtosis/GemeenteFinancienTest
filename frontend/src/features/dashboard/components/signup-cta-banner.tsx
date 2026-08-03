import { Button } from "@/components/base/buttons/button";

export function SignupCtaBanner() {
    return (
        <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 shadow-xs ring-1 ring-secondary ring-inset md:flex-row md:items-center">
            <div className="flex flex-1 flex-col gap-0.5 md:w-0">
                <p className="text-sm font-semibold text-secondary">Maak een gratis account aan</p>
                <p className="text-sm text-tertiary">Stel vragen aan de AI-assistent over de cijfers van jouw gemeente en krijg persoonlijke ondersteuning.</p>
            </div>
            <Button href="/signup" size="sm">
                Account aanmaken
            </Button>
        </div>
    );
}
