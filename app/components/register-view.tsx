"use client";

import { useEffect } from "react";

type RegisterViewProps =
  | {
      materialId: string;
      volumeId?: never;
    }
  | {
      materialId?: never;
      volumeId: string;
    };

export default function RegisterView(props: RegisterViewProps) {
  useEffect(() => {
    const isVolumeView = "volumeId" in props;
    const targetId = isVolumeView ? props.volumeId : props.materialId;

    if (!targetId) {
      return;
    }

    const storageKey = isVolumeView
      ? `viewed-volume:${targetId}`
      : `viewed-material:${targetId}`;

    const alreadyViewed = window.localStorage.getItem(storageKey);

    if (alreadyViewed) {
      return;
    }

    const registerView = async () => {
      try {
        const response = await fetch("/api/materials/view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isVolumeView
              ? { volumeId: props.volumeId }
              : { materialId: props.materialId }
          ),
        });

        if (response.ok) {
          window.localStorage.setItem(storageKey, "true");
        }
      } catch {
        // não quebra a interface em caso de falha
      }
    };

    registerView();
  }, [props]);

  return null;
}