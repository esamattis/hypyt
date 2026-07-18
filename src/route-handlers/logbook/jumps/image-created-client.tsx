import { Script } from "@/components/script";
import { $markImageJumpCreated } from "@/route-handlers/logbook/jumps/image-jump-storage-client";

export function JumpImageCreationComplete(props: {
    imageId: string;
    jumpUuid: string;
    jumpNumber: number;
    redirectUrl: string;
}) {
    return (
        <main className="mx-auto max-w-lg p-6 text-slate-700 dark:text-slate-200">
            <p>Saving source image in this browser...</p>
            <p className="mt-3">
                <a className="font-medium underline" href={props.redirectUrl}>
                    Continue to logbook
                </a>
            </p>
            <Script
                $deps={[$markImageJumpCreated]}
                $args={[
                    {
                        imageId: props.imageId,
                        jumpUuid: props.jumpUuid,
                        jumpNumber: props.jumpNumber,
                        redirectUrl: props.redirectUrl,
                    },
                ]}
                $exec={async (config) => {
                    try {
                        await $markImageJumpCreated(config.imageId, {
                            uuid: config.jumpUuid,
                            jumpNumber: config.jumpNumber,
                        });
                    } catch (error) {
                        console.error(
                            "Failed to link the jump to its source image",
                            error,
                        );
                    }
                    window.location.replace(config.redirectUrl);
                }}
            />
        </main>
    );
}
