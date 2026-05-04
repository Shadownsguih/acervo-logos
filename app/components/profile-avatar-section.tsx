"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase-browser";

type ProfileAvatarSectionProps = {
  userId: string;
  initialAvatarUrl: string | null;
  displayName: string;
  initialBio?: string;
  variant?: "full" | "compact";
};

const MAX_DIMENSION = 500;
const MAX_INPUT_FILE_SIZE = 8 * 1024 * 1024;
const MAX_OUTPUT_FILE_SIZE = 180 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PREVIEW_SIZE = 280;

function getInitials(name: string) {
  const cleaned = name.trim();

  if (!cleaned) {
    return "AL";
  }

  const parts = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "AL";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nao foi possivel ler a imagem."));
    };

    reader.onerror = () => {
      reject(new Error("Nao foi possivel ler a imagem."));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Nao foi possivel processar a imagem."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nao foi possivel compactar a imagem."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

function getBaseScale(imageWidth: number, imageHeight: number) {
  return Math.max(PREVIEW_SIZE / imageWidth, PREVIEW_SIZE / imageHeight);
}

function clampCropOffset(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const baseScale = getBaseScale(imageWidth, imageHeight);
  const renderedWidth = imageWidth * baseScale * zoom;
  const renderedHeight = imageHeight * baseScale * zoom;

  const maxOffsetX = Math.max(0, (renderedWidth - PREVIEW_SIZE) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - PREVIEW_SIZE) / 2);

  return {
    x: Math.min(Math.max(offsetX, -maxOffsetX), maxOffsetX),
    y: Math.min(Math.max(offsetY, -maxOffsetY), maxOffsetY),
  };
}

async function buildCroppedAvatar(options: {
  image: HTMLImageElement;
  zoom: number;
  offsetX: number;
  offsetY: number;
}) {
  const { image, zoom, offsetX, offsetY } = options;

  const canvas = document.createElement("canvas");
  canvas.width = MAX_DIMENSION;
  canvas.height = MAX_DIMENSION;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem.");
  }

  const previewToOutputRatio = MAX_DIMENSION / PREVIEW_SIZE;
  const baseScale = getBaseScale(image.naturalWidth, image.naturalHeight);
  const finalScale = baseScale * zoom * previewToOutputRatio;

  const drawWidth = image.naturalWidth * finalScale;
  const drawHeight = image.naturalHeight * finalScale;

  const drawX = (MAX_DIMENSION - drawWidth) / 2 + offsetX * previewToOutputRatio;
  const drawY =
    (MAX_DIMENSION - drawHeight) / 2 + offsetY * previewToOutputRatio;

  context.clearRect(0, 0, MAX_DIMENSION, MAX_DIMENSION);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > MAX_OUTPUT_FILE_SIZE && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  const optimizedFile = new File([blob], "avatar.webp", {
    type: "image/webp",
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    previewUrl: URL.createObjectURL(blob),
    size: blob.size,
  };
}

export default function ProfileAvatarSection({
  userId,
  initialAvatarUrl,
  displayName,
  initialBio = "",
  variant = "full",
}: ProfileAvatarSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);

  const initials = getInitials(displayName);

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function persistAvatarUrl(nextAvatarUrl: string | null) {
    const { error } = await supabase.from("user_profiles").upsert(
      {
        id: userId,
        avatar_url: nextAvatarUrl,
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      throw new Error("Nao foi possivel atualizar o perfil do usuario.");
    }
  }

  function resetCropEditor() {
    setIsCropOpen(false);
    setCropSource(null);
    setCropImage(null);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setIsDraggingCrop(false);
    dragDataRef.current = null;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setErrorMessage("Use apenas imagens JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_INPUT_FILE_SIZE) {
      setErrorMessage("Envie um arquivo menor que 8 MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      const image = await loadImage(dataUrl);

      setCropSource(dataUrl);
      setCropImage(image);
      setCropZoom(1);
      setCropOffsetX(0);
      setCropOffsetY(0);
      setIsCropOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel preparar a imagem."
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleCropPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!cropImage) {
      return;
    }

    event.preventDefault();

    dragDataRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: cropOffsetX,
      originOffsetY: cropOffsetY,
    };

    setIsDraggingCrop(true);
  }

  function handleCropPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!cropImage || !dragDataRef.current) {
      return;
    }

    const dx = event.clientX - dragDataRef.current.startX;
    const dy = event.clientY - dragDataRef.current.startY;

    const clamped = clampCropOffset(
      cropImage.naturalWidth,
      cropImage.naturalHeight,
      cropZoom,
      dragDataRef.current.originOffsetX + dx,
      dragDataRef.current.originOffsetY + dy
    );

    setCropOffsetX(clamped.x);
    setCropOffsetY(clamped.y);
  }

  function handleCropPointerUp() {
    dragDataRef.current = null;
    setIsDraggingCrop(false);
  }

  function handleZoomChange(nextZoom: number) {
    if (!cropImage) {
      return;
    }

    const clamped = clampCropOffset(
      cropImage.naturalWidth,
      cropImage.naturalHeight,
      nextZoom,
      cropOffsetX,
      cropOffsetY
    );

    setCropZoom(nextZoom);
    setCropOffsetX(clamped.x);
    setCropOffsetY(clamped.y);
  }

  async function handleConfirmCrop() {
    if (!cropImage) {
      setErrorMessage("Nenhuma imagem foi carregada para recorte.");
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setIsUploading(true);

    try {
      const cropped = await buildCroppedAvatar({
        image: cropImage,
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      });

      const filePath = `${userId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, cropped.file, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error("Nao foi possivel enviar a foto de perfil.");
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

      await persistAvatarUrl(publicUrl);
      setAvatarUrl(publicUrl);
      setStatusMessage("Foto atualizada com sucesso.");
      resetCropEditor();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar a foto de perfil."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setErrorMessage("");
    setStatusMessage("");
    setIsRemoving(true);

    try {
      const filePath = `${userId}/avatar.webp`;

      const { error: removeStorageError } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

      if (removeStorageError) {
        throw new Error("Nao foi possivel remover a imagem do storage.");
      }

      await persistAvatarUrl(null);
      setAvatarUrl(null);
      setStatusMessage("Foto de perfil removida com sucesso.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel remover a foto de perfil."
      );
    } finally {
      setIsRemoving(false);
    }
  }

  const cropTransform =
    cropImage
      ? (() => {
          const baseScale = getBaseScale(
            cropImage.naturalWidth,
            cropImage.naturalHeight
          );
          const renderedWidth = cropImage.naturalWidth * baseScale * cropZoom;
          const renderedHeight = cropImage.naturalHeight * baseScale * cropZoom;

          return {
            width: renderedWidth,
            height: renderedHeight,
            left: (PREVIEW_SIZE - renderedWidth) / 2 + cropOffsetX,
            top: (PREVIEW_SIZE - renderedHeight) / 2 + cropOffsetY,
          };
        })()
      : null;

  return (
    <>
      {variant === "compact" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil do usuario"
                    className="h-16 w-16 rounded-full border border-white/10 object-cover shadow-[0_10px_25px_-18px_rgba(0,0,0,0.9)]"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[#12151d] text-base font-semibold text-amber-300 shadow-[0_10px_25px_-18px_rgba(0,0,0,0.9)]">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isUploading || isRemoving}
                  className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-amber-400 text-black shadow-[0_12px_24px_-16px_rgba(245,158,11,0.95)] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Editar foto de perfil"
                  title="Editar foto de perfil"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="m16.5 3.5 4 4L7 21l-4 1 1-4L16.5 3.5Z" />
                  </svg>
                </button>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                  Hello
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-white">
                  {displayName}
                </p>
              </div>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              {statusMessage}
            </div>
          ) : null}

          <div className="mt-5 rounded-[20px] border border-amber-400/12 bg-amber-400/[0.06] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/75">
              Biografia curta
            </p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              {initialBio.trim()
                ? initialBio.trim()
                : "Adicione uma biografia curta para apresentar melhor seu perfil."}
            </p>
          </div>
        </>
      ) : (
      <section className="rounded-[24px] bg-[#171827] p-4 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.85)] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-6 md:shadow-none">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
          Foto de perfil
        </p>

        <h2 className="mt-2 text-xl font-bold">Avatar do usuario</h2>

        <div className="mt-5 flex flex-col items-center gap-4 p-2">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil do usuario"
                className="h-24 w-24 rounded-full border border-white/10 object-cover md:h-28 md:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#181c28] text-xl font-semibold text-amber-300 md:h-28 md:w-28 md:text-2xl">
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={openFilePicker}
              disabled={isUploading || isRemoving}
              className="absolute -bottom-1 -right-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-amber-400 text-black shadow-[0_12px_24px_-16px_rgba(245,158,11,0.95)] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Editar foto de perfil"
              title="Editar foto de perfil"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="m16.5 3.5 4 4L7 21l-4 1 1-4L16.5 3.5Z" />
              </svg>
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-zinc-100">{displayName}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Toque no lapis para alterar sua foto.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {avatarUrl ? (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={isUploading || isRemoving}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRemoving ? "Removendo..." : "Remover"}
            </button>
          ) : null}

          {errorMessage ? (
            <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              {statusMessage}
            </div>
          ) : null}
        </div>
      </section>
      )}

      {isCropOpen && cropImage && cropSource ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0f1117] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                  Ajustar avatar
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  Enquadre sua foto
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                  Arraste a imagem para centralizar melhor o rosto e use o zoom
                  para aproximar ou afastar.
                </p>
              </div>

              <button
                type="button"
                onClick={resetCropEditor}
                disabled={isUploading}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="flex flex-col items-center">
                <div
                  onPointerDown={handleCropPointerDown}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerLeave={handleCropPointerUp}
                  className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-[#12151d] ${
                    isDraggingCrop ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{
                    width: PREVIEW_SIZE,
                    height: PREVIEW_SIZE,
                    touchAction: "none",
                  }}
                >
                  {cropTransform ? (
                    <img
                      src={cropSource}
                      alt="Pre-visualizacao do avatar"
                      draggable={false}
                      className="pointer-events-none absolute select-none object-cover"
                      style={{
                        width: cropTransform.width,
                        height: cropTransform.height,
                        left: cropTransform.left,
                        top: cropTransform.top,
                        maxWidth: "none",
                      }}
                    />
                  ) : null}

                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-black/30" />
                    <div
                      className="absolute left-1/2 top-1/2 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                      style={{
                        width: 220,
                        height: 220,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-zinc-500">
                  Arraste a imagem dentro da area para ajustar o enquadramento.
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Zoom
                  </p>

                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={cropZoom}
                    onChange={(event) =>
                      handleZoomChange(Number(event.target.value))
                    }
                    className="mt-4 w-full"
                  />

                  <p className="mt-2 text-sm text-zinc-300">
                    {Math.round(cropZoom * 100)}%
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Previa
                  </p>

                  <div className="mt-4 flex justify-center">
                    <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-[#12151d]">
                      {cropTransform ? (
                        <div className="relative h-full w-full overflow-hidden rounded-full">
                          <img
                            src={cropSource}
                            alt="Previa circular do avatar"
                            draggable={false}
                            className="pointer-events-none absolute select-none object-cover"
                            style={{
                              width: cropTransform.width * (96 / PREVIEW_SIZE),
                              height: cropTransform.height * (96 / PREVIEW_SIZE),
                              left: cropTransform.left * (96 / PREVIEW_SIZE),
                              top: cropTransform.top * (96 / PREVIEW_SIZE),
                              maxWidth: "none",
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-zinc-400">
                  O sistema gera uma imagem otimizada em WEBP para melhorar o
                  carregamento.
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetCropEditor}
                disabled={isUploading}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={isUploading}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "Salvando foto..." : "Usar esta foto"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
