import type React from "react";
import { Trash01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

interface DeleteAccountModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    password: string;
    onPasswordChange: (password: string) => void;
    error: string | null;
    isDeleting: boolean;
    onConfirm: () => void;
}

/**
 * The last step before an irreversible delete. It asks for the current password rather than a
 * typed-out phrase because that is what the endpoint actually verifies — a confirmation nobody
 * else sitting at the same screen can pass.
 */
export function DeleteAccountModal({ isOpen, onOpenChange, password, onPasswordChange, error, isDeleting, onConfirm }: DeleteAccountModalProps) {
    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        onConfirm();
    }

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!isDeleting}>
            <Modal className="max-w-100">
                <Dialog>
                    <Form onSubmit={handleSubmit} className="relative flex w-full flex-col gap-4 rounded-xl bg-primary p-6 shadow-xl">
                        <div className="absolute top-3 right-3">
                            <CloseButton size="sm" label="Sluiten" isDisabled={isDeleting} onPress={() => onOpenChange(false)} />
                        </div>

                        <FeaturedIcon icon={Trash01} color="error" theme="light" size="lg" />

                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-semibold text-primary">Account verwijderen?</h2>
                            <p className="text-sm text-tertiary">
                                Je account, je persoonlijke gegevens en je notities worden permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.
                            </p>
                        </div>

                        <Input
                            isRequired
                            autoFocus
                            type="password"
                            label="Bevestig met je wachtwoord"
                            name="password"
                            value={password}
                            onChange={onPasswordChange}
                            isInvalid={Boolean(error)}
                            hint={error ?? undefined}
                            placeholder="••••••••••••"
                        />

                        <div className="mt-2 flex gap-3">
                            <Button type="button" className="flex-1" size="md" color="secondary" isDisabled={isDeleting} onClick={() => onOpenChange(false)}>
                                Annuleren
                            </Button>
                            <Button type="submit" className="flex-1" size="md" color="primary-destructive" isLoading={isDeleting} showTextWhileLoading>
                                Verwijderen
                            </Button>
                        </div>
                    </Form>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
