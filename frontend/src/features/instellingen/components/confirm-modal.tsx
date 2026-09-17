import type { FC, ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

interface ConfirmModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    icon: FC<{ className?: string }>;
    color?: "brand" | "warning" | "error";
    isConfirming?: boolean;
    onConfirm: () => void;
}

/**
 * De bevestigingsdialoog voor onomkeerbare acties op deze pagina. Verving een kale
 * window.confirm(), die het enige stukje browser-chrome in de hele app was.
 */
export function ConfirmModal({
    isOpen,
    onOpenChange,
    title,
    description,
    confirmLabel,
    icon,
    color = "warning",
    isConfirming,
    onConfirm,
}: ConfirmModalProps) {
    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <Modal className="max-w-100">
                <Dialog>
                    <div className="relative flex w-full flex-col gap-4 rounded-xl bg-primary p-6 shadow-xl">
                        <div className="absolute top-3 right-3">
                            <CloseButton size="sm" label="Sluiten" onPress={() => onOpenChange(false)} />
                        </div>

                        <FeaturedIcon icon={icon} color={color} theme="light" size="lg" />

                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-semibold text-primary">{title}</h2>
                            <p className="text-sm text-tertiary">{description}</p>
                        </div>

                        <div className="mt-2 flex gap-3">
                            <Button className="flex-1" size="md" color="secondary" isDisabled={isConfirming} onClick={() => onOpenChange(false)}>
                                Annuleren
                            </Button>
                            <Button className="flex-1" size="md" color="primary" isLoading={isConfirming} showTextWhileLoading onClick={onConfirm}>
                                {confirmLabel}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
