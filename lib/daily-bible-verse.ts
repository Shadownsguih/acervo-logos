import { createClient } from "@supabase/supabase-js";

export type DailyBibleVerse = {
  id: string;
  date_key: string;
  bible_verse_id: string | null;
  version: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  created_at: string;
};

type BibleVerseRow = {
  id: string;
  version: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

function getBrazilDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não está definida.");
  }

  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY não está definida.");
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getOrCreateDailyBibleVerse() {
  const supabase = createAdminSupabaseClient();
  const todayKey = getBrazilDateKey();

  const { data: existingDailyVerse, error: existingDailyVerseError } = await supabase
    .from("daily_bible_verses")
    .select("*")
    .eq("date_key", todayKey)
    .maybeSingle();

  if (existingDailyVerseError) {
    throw new Error(
      `Erro ao buscar o versículo diário existente: ${existingDailyVerseError.message}`
    );
  }

  if (existingDailyVerse) {
    return existingDailyVerse as DailyBibleVerse;
  }

  const { count, error: countError } = await supabase
    .from("bible_verses")
    .select("*", { count: "exact", head: true })
    .eq("version", "NVI");

  if (countError) {
    throw new Error(`Erro ao contar versículos da NVI: ${countError.message}`);
  }

  if (!count || count <= 0) {
    throw new Error("Nenhum versículo da NVI foi encontrado em bible_verses.");
  }

  const randomIndex = Math.floor(Math.random() * count);

  const { data: randomVerse, error: randomVerseError } = await supabase
    .from("bible_verses")
    .select("id, version, book, abbrev, chapter, verse, reference, text")
    .eq("version", "NVI")
    .range(randomIndex, randomIndex)
    .maybeSingle();

  if (randomVerseError) {
    throw new Error(`Erro ao buscar versículo aleatório: ${randomVerseError.message}`);
  }

  if (!randomVerse) {
    throw new Error("Não foi possível encontrar um versículo aleatório da NVI.");
  }

  const verse = randomVerse as BibleVerseRow;

  const payload = {
    date_key: todayKey,
    bible_verse_id: verse.id,
    version: verse.version,
    book: verse.book,
    abbrev: verse.abbrev,
    chapter: verse.chapter,
    verse: verse.verse,
    reference: verse.reference,
    text: verse.text,
  };

  const { error: insertError } = await supabase
    .from("daily_bible_verses")
    .upsert(payload, { onConflict: "date_key" });

  if (insertError) {
    throw new Error(`Erro ao salvar o versículo diário: ${insertError.message}`);
  }

  const { data: savedDailyVerse, error: savedDailyVerseError } = await supabase
    .from("daily_bible_verses")
    .select("*")
    .eq("date_key", todayKey)
    .single();

  if (savedDailyVerseError) {
    throw new Error(
      `Erro ao confirmar o versículo diário salvo: ${savedDailyVerseError.message}`
    );
  }

  return savedDailyVerse as DailyBibleVerse;
}