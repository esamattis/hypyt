import {
    $loadJumpImageDrafts,
    type CreatedJump,
    type JumpImageDraft,
    type StoredJumpImages,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export function $markImageJumpCreated(
    imageId: string,
    createdJump: CreatedJump,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("loki-jump-from-image", 1);
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("images", "readwrite");
            const store = tx.objectStore("images");
            const getRequest = store.get("draft");
            getRequest.onsuccess = () => {
                const current: StoredJumpImages | undefined = getRequest.result;
                if (!Array.isArray(current?.images)) {
                    return;
                }
                const images = current.images.map((image) => {
                    if (image.id !== imageId) {
                        return image;
                    }
                    const createdJumps = Array.isArray(image.createdJumps)
                        ? image.createdJumps.filter(
                              (jump) => jump.uuid !== createdJump.uuid,
                          )
                        : [];
                    return {
                        ...image,
                        createdJumps: [...createdJumps, createdJump],
                    };
                });
                store.put({ ...current, images }, "draft");
            };
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(
                    tx.error ??
                        new Error(
                            "Failed to link the jump to its source image",
                        ),
                );
            };
        };
    });
}

export async function $loadImageForJump(
    jumpUuid: string,
): Promise<JumpImageDraft | null> {
    const stored = await $loadJumpImageDrafts(
        "loki-jump-from-image",
        "images",
        "draft",
    );
    return (
        stored.drafts.find((draft) =>
            draft.createdJumps.some((jump) => jump.uuid === jumpUuid),
        ) ?? null
    );
}
