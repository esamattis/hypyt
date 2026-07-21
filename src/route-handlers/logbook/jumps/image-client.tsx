import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { $assertElement, $idb, $renderTemplate, $select } from "@/utils";
import * as routes from "@/routes";
import {
    $appendJumpImageDrafts,
    $loadImage,
    $loadJumpImageDrafts,
    $updateJumpImageDrafts,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
    jumpImageDbName,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export {
    JUMP_IMAGE_DB_NAME,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export const JUMP_IMAGE_MAX_DIMENSION = 2048;
export const JUMP_IMAGE_TARGET_BYTES = 2 * 1024 * 1024;
interface JumpImageInputProps {
    inputId: string;
    uploadInputId: string;
    imageIdInputId: string;
    formId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
    galleryId: string;
    galleryImageIdsInputId: string;
    gallerySelectedIdInputId: string;
    resizeNoteId: string;
    jumpLinkTemplateId: string;
    jumpEditUrlTemplate: string;
    maxDimension: number;
    targetBytes: number;
    dbName: string;
    storeName: string;
    storageKey: string;
}

export function ImageGallery(props: {
    inputId: string;
    uploadInputId: string;
    imageIdInputId: string;
    formId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
}) {
    const dbName = jumpImageDbName(useAppContext().getUser().uuid);
    const galleryId = useId();
    const galleryImageIdsInputId = useId();
    const gallerySelectedIdInputId = useId();
    const resizeNoteId = useId();
    const jumpLinkTemplateId = useId();

    return (
        <>
            <input
                id={galleryImageIdsInputId}
                type="hidden"
                name="imageIds"
                data-loki-gallery-query
            />
            <input
                id={gallerySelectedIdInputId}
                type="hidden"
                name="selectedId"
                data-loki-gallery-query
            />
            <div
                id={galleryId}
                className="space-y-2"
                hx-get={routes.logbook.jumps.imageGalleryFragment({}, {})}
                hx-include="[data-loki-gallery-query]"
                hx-trigger="load, jump-images-changed"
                hx-swap="innerHTML"
            />
            <p
                id={resizeNoteId}
                className="hidden rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200"
            />
            <template id={jumpLinkTemplateId}>
                <a
                    data-loki-template-slot="label"
                    className="font-semibold underline hover:no-underline"
                />
            </template>
            <Script
                $deps={[
                    $assertElement,
                    $idb,
                    $select,
                    $renderTemplate,
                    $appendJumpImageDrafts,
                    $loadImage,
                    $loadJumpImageDrafts,
                    $updateJumpImageDrafts,
                    $resizeJumpImageIfNeeded,
                    $formatJumpImageBytes,
                    $getJumpImageElements,
                    $updateJumpImageGallery,
                    $enrichJumpImageGalleryItem,
                    $prepareJumpImageFiles,
                    $setupCameraImageInput,
                    $setupClipboardImageInput,
                    $imageMimeTypeToExtension,
                    $setJumpImageUploadFile,
                    $setJumpImageProcessing,
                    $deleteJumpImageDraft,
                    $clearAllJumpImageDrafts,
                    $appendJumpImageFiles,
                    $createJumpImageGalleryController,
                ]}
                $args={[
                    {
                        inputId: props.inputId,
                        uploadInputId: props.uploadInputId,
                        imageIdInputId: props.imageIdInputId,
                        formId: props.formId,
                        cameraInputId: props.cameraInputId,
                        cameraButtonId: props.cameraButtonId,
                        clipboardButtonId: props.clipboardButtonId,
                        galleryId,
                        galleryImageIdsInputId,
                        gallerySelectedIdInputId,
                        resizeNoteId,
                        jumpLinkTemplateId,
                        jumpEditUrlTemplate: routes.logbook.jumps.edit({
                            uuid: "__JUMP_UUID__",
                        }),
                        maxDimension: JUMP_IMAGE_MAX_DIMENSION,
                        targetBytes: JUMP_IMAGE_TARGET_BYTES,
                        dbName,
                        storeName: JUMP_IMAGE_STORE,
                        storageKey: JUMP_IMAGE_KEY,
                    },
                ]}
                $exec={$initJumpImageInput}
            />
        </>
    );
}

export async function $resizeJumpImageIfNeeded(
    file: File,
    maxDimension: number,
    targetBytes: number,
): Promise<{
    file: File;
    originalWidth: number;
    originalHeight: number;
    width: number;
    height: number;
    resized: boolean;
}> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const element = new Image();
        element.onload = () => {
            URL.revokeObjectURL(url);
            resolve(element);
        };
        element.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image for preview"));
        };
        element.src = url;
    });

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const needsResize = longestSide > maxDimension || file.size > targetBytes;
    if (!needsResize) {
        return {
            file,
            originalWidth: image.naturalWidth,
            originalHeight: image.naturalHeight,
            width: image.naturalWidth,
            height: image.naturalHeight,
            resized: false,
        };
    }

    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        return {
            file,
            originalWidth: image.naturalWidth,
            originalHeight: image.naturalHeight,
            width: image.naturalWidth,
            height: image.naturalHeight,
            resized: false,
        };
    }
    context.drawImage(image, 0, 0, width, height);

    const outputType =
        file.type === "image/png" || file.type === "image/webp"
            ? file.type
            : "image/jpeg";

    async function encode(quality: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to encode image"));
                        return;
                    }
                    resolve(blob);
                },
                outputType,
                quality,
            );
        });
    }

    let quality = 0.92;
    let blob = await encode(quality);
    while (blob.size > targetBytes && quality > 0.5) {
        quality -= 0.1;
        blob = await encode(quality);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "jump-image";
    const extension =
        outputType === "image/png"
            ? "png"
            : outputType === "image/webp"
              ? "webp"
              : "jpg";
    return {
        file: new File([blob], `${baseName}.${extension}`, {
            type: outputType,
            lastModified: Date.now(),
        }),
        originalWidth: image.naturalWidth,
        originalHeight: image.naturalHeight,
        width,
        height,
        resized: true,
    };
}

export function $formatJumpImageBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function $imageMimeTypeToExtension(mimeType: string): string {
    const sub = mimeType.split("/")[1] ?? "";
    if (sub === "jpeg") {
        return "jpg";
    }
    return sub || "img";
}

export function $setupClipboardImageInput(
    clipboardButton: HTMLButtonElement,
    handleSelectedFiles: (files: File[]) => void,
) {
    function makeClipboardImage(blob: Blob, mimeType: string) {
        const ext = $imageMimeTypeToExtension(mimeType);
        return new File([blob], `pasted-image.${ext}`, {
            type: mimeType,
            lastModified: Date.now(),
        });
    }

    clipboardButton.addEventListener("click", async () => {
        try {
            if (typeof navigator.clipboard?.read !== "function") {
                return;
            }
            const clipboardItems = await navigator.clipboard.read();
            const files: File[] = [];
            for (const item of clipboardItems) {
                const imageType = item.types.find((t) =>
                    t.startsWith("image/"),
                );
                if (imageType) {
                    const blob = await item.getType(imageType);
                    files.push(makeClipboardImage(blob, imageType));
                }
            }
            handleSelectedFiles(files);
        } catch (error) {
            console.error("Failed to read an image from the clipboard", error);
        }
    });

    window.addEventListener("paste", (event) => {
        const data = event.clipboardData;
        if (data == null) {
            return;
        }
        const target = event.target;
        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
        ) {
            return;
        }
        const files: File[] = [];
        for (const item of data.items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    files.push(
                        makeClipboardImage(file, file.type || "image/png"),
                    );
                }
            }
        }
        if (files.length > 0) {
            event.preventDefault();
            handleSelectedFiles(files);
        }
    });
}

export function $setupCameraImageInput(
    cameraInput: HTMLInputElement,
    cameraButton: HTMLButtonElement,
    handleSelectedFiles: (files: File[]) => void,
) {
    cameraInput.addEventListener("change", () => {
        const files = Array.from(cameraInput.files ?? []);
        cameraInput.value = "";
        handleSelectedFiles(files);
    });
    cameraButton.addEventListener("click", () => cameraInput.click());
}

export function $getJumpImageElements(props: JumpImageInputProps) {
    const inputEl = $select.id(props.inputId, HTMLInputElement);
    const uploadInputEl = $select.id(props.uploadInputId, HTMLInputElement);
    const imageIdInputEl = $select.id(props.imageIdInputId, HTMLInputElement);
    const formEl = $select.id(props.formId, HTMLFormElement);
    const cameraInputEl = $select.id(props.cameraInputId, HTMLInputElement);
    const cameraButtonEl = $select.id(props.cameraButtonId, HTMLButtonElement);
    const clipboardButtonEl = $select.id(
        props.clipboardButtonId,
        HTMLButtonElement,
    );
    const galleryEl = $select.id(props.galleryId, HTMLElement);
    const galleryImageIdsInputEl = $select.id(
        props.galleryImageIdsInputId,
        HTMLInputElement,
    );
    const gallerySelectedIdInputEl = $select.id(
        props.gallerySelectedIdInputId,
        HTMLInputElement,
    );
    const resizeNoteEl = $select.id(props.resizeNoteId, HTMLElement);
    return {
        input: inputEl,
        uploadInput: uploadInputEl,
        imageIdInput: imageIdInputEl,
        form: formEl,
        cameraInput: cameraInputEl,
        cameraButton: cameraButtonEl,
        clipboardButton: clipboardButtonEl,
        gallery: galleryEl,
        galleryImageIdsInput: galleryImageIdsInputEl,
        gallerySelectedIdInput: gallerySelectedIdInputEl,
        resizeNote: resizeNoteEl,
    };
}

export function $updateJumpImageGallery(options: {
    gallery: HTMLElement;
    imageIdsInput: HTMLInputElement;
    selectedIdInput: HTMLInputElement;
    imageIds: string[];
    selectedId: string | null;
}) {
    options.imageIdsInput.value = options.imageIds.join(",");
    options.selectedIdInput.value = options.selectedId ?? "";
    options.gallery.dispatchEvent(
        new CustomEvent("jump-images-changed", { bubbles: true }),
    );
}

export function $enrichJumpImageGalleryItem(options: {
    event: Event;
    jumpLinkTemplateId: string;
    jumpEditUrlTemplate: string;
}) {
    if (!(options.event instanceof CustomEvent)) {
        return;
    }
    const image = options.event.target;
    $assertElement(image, HTMLImageElement);
    const item = image.closest("[data-loki-gallery-image]");
    $assertElement(item, HTMLElement);
    const draft = options.event.detail;
    const selectButton = $select.el(
        "[data-loki-select-image]",
        HTMLButtonElement,
        item,
    );
    const deleteButton = $select.el(
        "[data-loki-delete-image]",
        HTMLButtonElement,
        item,
    );
    const meta = $select.el("[data-loki-image-meta]", HTMLElement, item);
    const readIndicator = $select.el(
        "[data-loki-read-image]",
        HTMLElement,
        item,
    );
    const createdJumps = $select.el(
        "[data-loki-created-jumps]",
        HTMLElement,
        item,
    );
    const createdJumpLinks = $select.el(
        "[data-loki-created-jump-links]",
        HTMLElement,
        item,
    );
    selectButton.setAttribute("aria-label", `Select ${draft.file.name}`);
    deleteButton.setAttribute("aria-label", `Delete ${draft.file.name}`);
    if (!image.alt.startsWith("Selected")) {
        image.alt = `Jump image preview: ${draft.file.name}`;
    }
    meta.textContent = `${draft.file.name} · ${$formatJumpImageBytes(draft.file.size)}`;
    readIndicator.classList.toggle("hidden", !draft.read);
    for (const [index, jump] of draft.createdJumps.entries()) {
        const linkContainer = document.createElement("span");
        $renderTemplate(linkContainer, options.jumpLinkTemplateId, {
            label: `Jump #${jump.jumpNumber}`,
        });
        const link = $select.el(":scope > *", HTMLAnchorElement, linkContainer);
        link.href = options.jumpEditUrlTemplate.replace(
            "__JUMP_UUID__",
            encodeURIComponent(jump.uuid),
        );
        if (index > 0) {
            createdJumpLinks.appendChild(document.createTextNode(", "));
        }
        createdJumpLinks.appendChild(link);
    }
    createdJumps.classList.toggle("hidden", draft.createdJumps.length === 0);
}

export async function $prepareJumpImageFiles(
    files: File[],
    props: JumpImageInputProps,
) {
    const results = await Promise.all(
        files.map((file) =>
            $resizeJumpImageIfNeeded(
                file,
                props.maxDimension,
                props.targetBytes,
            ).then((result) => ({ original: file, result })),
        ),
    );
    const appended = await $appendJumpImageDrafts(
        {
            files: results.map((item) => item.result.file),
            dbName: props.dbName,
            storeName: props.storeName,
            storageKey: props.storageKey,
        },
        $idb,
    );
    const notes = results
        .filter((item) => item.result.resized)
        .map(
            (item) =>
                `Resized from ${$formatJumpImageBytes(item.original.size)} (${item.result.originalWidth} x ${item.result.originalHeight}) to ${$formatJumpImageBytes(item.result.file.size)} (${item.result.width} x ${item.result.height}).`,
        );
    return { appended, notes };
}

interface JumpImageGalleryState {
    imageIds: string[];
    selectedId: string | null;
    processingCount: number;
}

function $setJumpImageUploadFile(
    elements: ReturnType<typeof $getJumpImageElements>,
    state: JumpImageGalleryState,
    file: File | undefined,
) {
    const transfer = new DataTransfer();
    if (file) {
        transfer.items.add(file);
    }
    elements.uploadInput.files = transfer.files;
    elements.imageIdInput.value = file ? (state.selectedId ?? "") : "";
}

function $setJumpImageProcessing(
    elements: ReturnType<typeof $getJumpImageElements>,
    state: JumpImageGalleryState,
    value: boolean,
) {
    const submit = $select.el(
        'button[type="submit"]',
        HTMLButtonElement,
        elements.form,
    );
    state.processingCount += value ? 1 : -1;
    submit.disabled = state.processingCount > 0;
    if (state.processingCount > 0) {
        elements.form.setAttribute("aria-busy", "true");
    } else {
        elements.form.removeAttribute("aria-busy");
    }
}

async function $deleteJumpImageDraft(options: {
    props: JumpImageInputProps;
    elements: ReturnType<typeof $getJumpImageElements>;
    state: JumpImageGalleryState;
    id: string;
    renderGalleryState: () => void;
}) {
    const remaining = options.state.imageIds.filter((id) => id !== options.id);
    const nextSelectedId =
        options.state.selectedId === options.id
            ? (remaining[0] ?? null)
            : options.state.selectedId;
    try {
        await $updateJumpImageDrafts({
            dbName: options.props.dbName,
            storeName: options.props.storeName,
            storageKey: options.props.storageKey,
            selectedId: nextSelectedId,
            deletedId: options.id,
        });
        options.state.imageIds = remaining;
        options.state.selectedId = nextSelectedId;
        const selected = nextSelectedId
            ? await $loadImage(nextSelectedId, options.props.dbName)
            : null;
        $setJumpImageUploadFile(
            options.elements,
            options.state,
            selected?.file,
        );
        options.renderGalleryState();
    } catch (error) {
        console.error("Failed to delete the jump image", error);
    }
}

async function $clearAllJumpImageDrafts(options: {
    props: JumpImageInputProps;
    elements: ReturnType<typeof $getJumpImageElements>;
    state: JumpImageGalleryState;
    renderGalleryState: () => void;
}) {
    try {
        await $updateJumpImageDrafts({
            dbName: options.props.dbName,
            storeName: options.props.storeName,
            storageKey: options.props.storageKey,
            selectedId: null,
            clearAll: true,
        });
    } catch (error) {
        console.error("Failed to clear jump images", error);
    } finally {
        options.state.imageIds = [];
        options.state.selectedId = null;
        $setJumpImageUploadFile(options.elements, options.state, undefined);
        options.elements.resizeNote.textContent = "";
        options.elements.resizeNote.classList.add("hidden");
        options.renderGalleryState();
    }
}

async function $appendJumpImageFiles(options: {
    props: JumpImageInputProps;
    elements: ReturnType<typeof $getJumpImageElements>;
    state: JumpImageGalleryState;
    files: File[];
    renderGalleryState: () => void;
}) {
    if (options.files.length === 0) {
        return;
    }
    $setJumpImageProcessing(options.elements, options.state, true);
    try {
        const prepared = await $prepareJumpImageFiles(
            options.files,
            options.props,
        );
        const appended = prepared.appended;
        options.state.imageIds = [
            ...appended.map((draft) => draft.id),
            ...options.state.imageIds,
        ];
        options.state.selectedId = appended[0]?.id ?? options.state.selectedId;
        $setJumpImageUploadFile(
            options.elements,
            options.state,
            appended.find((item) => item.id === options.state.selectedId)?.file,
        );
        options.elements.resizeNote.textContent = prepared.notes.join(" ");
        options.elements.resizeNote.classList.toggle(
            "hidden",
            prepared.notes.length === 0,
        );
        options.renderGalleryState();
    } catch (error) {
        console.error("Failed to process the selected jump images", error);
        options.elements.resizeNote.textContent =
            "Could not process the selected images.";
        options.elements.resizeNote.classList.remove("hidden");
    } finally {
        $setJumpImageProcessing(options.elements, options.state, false);
    }
}

function $createJumpImageGalleryController(
    props: JumpImageInputProps,
    elements: ReturnType<typeof $getJumpImageElements>,
) {
    const state: JumpImageGalleryState = {
        imageIds: [],
        selectedId: null,
        processingCount: 0,
    };

    function renderGalleryState() {
        $updateJumpImageGallery({
            gallery: elements.gallery,
            imageIdsInput: elements.galleryImageIdsInput,
            selectedIdInput: elements.gallerySelectedIdInput,
            imageIds: state.imageIds,
            selectedId: state.selectedId,
        });
    }

    async function selectDraft(id: string) {
        const draft = await $loadImage(id, props.dbName);
        if (!draft) {
            return;
        }
        state.selectedId = id;
        $setJumpImageUploadFile(elements, state, draft.file);
        renderGalleryState();
        void $updateJumpImageDrafts({
            dbName: props.dbName,
            storeName: props.storeName,
            storageKey: props.storageKey,
            selectedId: state.selectedId,
        }).catch((error) => {
            console.error("Failed to save the selected jump image", error);
        });
    }

    function restoreDrafts() {
        void $loadJumpImageDrafts(
            props.dbName,
            props.storeName,
            props.storageKey,
        )
            .then((stored) => {
                state.imageIds = stored.drafts.map((draft) => draft.id);
                state.selectedId = state.imageIds.some(
                    (id) => id === stored.selectedId,
                )
                    ? stored.selectedId
                    : (state.imageIds[0] ?? null);
                $setJumpImageUploadFile(
                    elements,
                    state,
                    stored.drafts.find((item) => item.id === state.selectedId)
                        ?.file,
                );
                renderGalleryState();
            })
            .catch((error) => {
                console.error("Failed to restore the jump image drafts", error);
            });
    }

    return {
        appendFiles(files: File[]) {
            return $appendJumpImageFiles({
                props,
                elements,
                state,
                files,
                renderGalleryState,
            });
        },
        clearAllDrafts() {
            return $clearAllJumpImageDrafts({
                props,
                elements,
                state,
                renderGalleryState,
            });
        },
        isProcessing() {
            return state.processingCount > 0;
        },
        restoreDrafts,
        deleteDraft(id: string) {
            return $deleteJumpImageDraft({
                props,
                elements,
                state,
                id,
                renderGalleryState,
            });
        },
        selectDraft,
    };
}

export function $initJumpImageInput(props: JumpImageInputProps) {
    const elements = $getJumpImageElements(props);
    const controller = $createJumpImageGalleryController(props, elements);

    elements.input.addEventListener("change", () => {
        const files = Array.from(elements.input.files ?? []);
        elements.input.value = "";
        void controller.appendFiles(files);
    });

    $setupCameraImageInput(
        elements.cameraInput,
        elements.cameraButton,
        controller.appendFiles,
    );
    $setupClipboardImageInput(elements.clipboardButton, controller.appendFiles);
    elements.gallery.addEventListener("click", (event) => {
        const target = event.target;
        $assertElement(target, Element);
        const selectButton = target.closest("[data-loki-select-image]");
        if (selectButton) {
            const button = selectButton;
            $assertElement(button, HTMLButtonElement);
            void controller.selectDraft(button.dataset.lokiSelectImage ?? "");
            return;
        }
        const deleteButton = target.closest("[data-loki-delete-image]");
        if (deleteButton) {
            const button = deleteButton;
            $assertElement(button, HTMLButtonElement);
            void controller.deleteDraft(button.dataset.lokiDeleteImage ?? "");
            return;
        }
        if (target.closest("[data-loki-clear-images]")) {
            void controller.clearAllDrafts();
        }
    });
    elements.gallery.addEventListener("loki:jump-image-loaded", (event) => {
        $enrichJumpImageGalleryItem({
            event,
            jumpLinkTemplateId: props.jumpLinkTemplateId,
            jumpEditUrlTemplate: props.jumpEditUrlTemplate,
        });
    });

    elements.form.addEventListener("submit", (event) => {
        if (!controller.isProcessing()) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
    });

    controller.restoreDrafts();
}
