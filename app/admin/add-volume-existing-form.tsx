"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Material = {
  id: string;
  title: string;
};

export default function AddVolumeExistingForm({
  materials,
}: {
  materials: Material[];
}) {
  const router = useRouter();

  const [materialId, setMaterialId] = useState("");
  const [title, setTitle] = useState("");
  const [volumeNumber, setVolumeNumber] = useState(1);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!materialId || !file || !title) {
      setMsg("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const formData = new FormData();

      formData.append("materialId", materialId);
      formData.append("title", title);
      formData.append("volumeNumber", String(volumeNumber));
      formData.append("description", description);
      formData.append("file", file);

      const res = await fetch("/api/admin/volumes/add", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setMsg("Volume adicionado com sucesso");

      setTitle("");
      setVolumeNumber(1);
      setDescription("");
      setFile(null);

      router.refresh();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold">Adicionar volume existente</h2>

      {msg && <p className="mt-4 text-sm text-amber-400">{msg}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          className="w-full p-3 bg-black rounded"
        >
          <option value="">Selecione a obra</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>

        <input
          placeholder="Título do volume"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 bg-black rounded"
        />

        <input
          type="number"
          value={volumeNumber}
          onChange={(e) => setVolumeNumber(Number(e.target.value))}
          className="w-full p-3 bg-black rounded"
        />

        <textarea
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 bg-black rounded"
        />

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-amber-400 text-black px-6 py-3 rounded"
        >
          {loading ? "Enviando..." : "Adicionar volume"}
        </button>
      </form>
    </section>
  );
}