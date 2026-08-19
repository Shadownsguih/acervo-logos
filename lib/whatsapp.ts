const DEFAULT_WHATSAPP_URL = "https://wa.me/";

export function getConfiguredWhatsAppLink() {
  const configuredLink = (process.env.NEXT_PUBLIC_WHATSAPP_LINK ?? "").trim();
  return configuredLink || DEFAULT_WHATSAPP_URL;
}

export function buildWhatsAppMessageLink(message: string) {
  const baseLink = getConfiguredWhatsAppLink();

  try {
    const url = new URL(baseLink);
    url.searchParams.set("text", message);
    return url.toString();
  } catch {
    const fallback = new URL(DEFAULT_WHATSAPP_URL);
    fallback.searchParams.set("text", message);
    return fallback.toString();
  }
}

export function buildPlanWhatsAppLink(planLabel: string) {
  return buildWhatsAppMessageLink(
    `Ola! Quero assinar o plano ${planLabel} do Acervo Logos.`
  );
}
