/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const curatedDailyBibleVerseLibrary = require("../data/daily-bible-verse-library.json");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao esta definida.");
  }

  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY nao esta definida.");
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function main() {
  const supabase = createAdminSupabaseClient();

  const payload = curatedDailyBibleVerseLibrary.map((entry) => ({
    ...entry,
  }));

  const { error: deleteError } = await supabase
    .from("daily_bible_verse_library")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    throw deleteError;
  }

  const { error } = await supabase
    .from("daily_bible_verse_library")
    .insert(payload);

  if (error) {
    throw error;
  }

  console.log(
    `Biblioteca de versiculo diario enviada com ${payload.length} registro(s).`
  );
}

main().catch((error) => {
  console.error("Erro ao semear daily_bible_verse_library:", error.message);
  process.exit(1);
});
