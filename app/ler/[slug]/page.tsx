import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { resolveReaderDocument } from "@/lib/reader/resolve-reader-document";
import ReaderV2RouteShell from "@/app/components/reader-v2-route-shell";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/login?erro=login&next=${encodeURIComponent(`/ler/${slug}`)}`);
  }

  const resolved = await resolveReaderDocument(slug);

  if (resolved.kind === "not-found") {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">Arquivo nao encontrado</h1>
          <p className="mt-4 text-zinc-400">
            O arquivo que voce tentou abrir nao existe ou nao esta disponivel.
          </p>
          <Link
            href="/categorias"
            className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para categorias
          </Link>
        </div>
      </main>
    );
  }

  return <ReaderV2RouteShell resolved={resolved} readerBasePath="/ler" />;
}
