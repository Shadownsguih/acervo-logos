import { supabase } from "@/lib/supabase";

type FetchBibleRowsOptions = {
  columns: string;
  version?: string;
  pageSize?: number;
};

export async function fetchAllBibleRows<T>({
  columns,
  version,
  pageSize = 1000,
}: FetchBibleRowsOptions) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("bible_verses")
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (version) {
      query = query.eq("version", version);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const chunk = (data ?? []) as T[];
    rows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: rows, error: null };
}
