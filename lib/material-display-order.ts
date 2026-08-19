type MaterialOrderRow = {
  id: string;
  display_order: number | null;
};

type MaterialOrderQueryResult = {
  data: MaterialOrderRow[] | null;
  error: { message?: string } | null;
};

type MaterialOrderQuery = {
  select: (columns: string) => MaterialOrderQuery;
  update: (values: { display_order: number }) => MaterialOrderQuery;
  eq: (column: string, value: string) => MaterialOrderQuery;
  neq: (column: string, value: string) => MaterialOrderQuery;
  not: (column: string, operator: string, value: null) => MaterialOrderQuery;
  gte: (column: string, value: number) => MaterialOrderQuery;
  gt: (column: string, value: number) => MaterialOrderQuery;
  lte: (column: string, value: number) => MaterialOrderQuery;
  lt: (column: string, value: number) => MaterialOrderQuery;
  order: (
    column: string,
    options: { ascending: boolean }
  ) => MaterialOrderQuery;
  limit: (count: number) => MaterialOrderQuery;
};

type SupabaseLike = {
  from: (table: string) => unknown;
};

function asMaterialOrderQuery(value: unknown) {
  return value as MaterialOrderQuery;
}

function asMaterialOrderQueryResult(value: unknown) {
  return value as MaterialOrderQueryResult;
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function getMaxDisplayOrder(
  supabase: SupabaseLike,
  categoryId: string,
  excludeMaterialId?: string
) {
  let query = asMaterialOrderQuery(supabase.from("materials"))
    .select("id, display_order")
    .eq("category_id", categoryId)
    .not("display_order", "is", null)
    .order("display_order", { ascending: false })
    .limit(1);

  if (excludeMaterialId) {
    query = query.neq("id", excludeMaterialId);
  }

  const { data, error } = asMaterialOrderQueryResult(await query);

  if (error) {
    throw new Error("Nao foi possivel consultar a ordem atual dos materiais.");
  }

  const maxOrder = Number(data?.[0]?.display_order ?? 0);

  return Number.isInteger(maxOrder) && maxOrder > 0 ? maxOrder : 0;
}

function clampPosition(position: number, maxAllowed: number) {
  if (position < 1) return 1;
  if (position > maxAllowed) return maxAllowed;
  return position;
}

async function incrementOrdersFromPosition(
  supabase: SupabaseLike,
  categoryId: string,
  fromPosition: number,
  excludeMaterialId?: string
) {
  let query = asMaterialOrderQuery(supabase.from("materials"))
    .select("id, display_order")
    .eq("category_id", categoryId)
    .gte("display_order", fromPosition)
    .order("display_order", { ascending: false });

  if (excludeMaterialId) {
    query = query.neq("id", excludeMaterialId);
  }

  const { data, error } = asMaterialOrderQueryResult(await query);

  if (error) {
    throw new Error("Nao foi possivel reorganizar os materiais da categoria.");
  }

  const rows = data ?? [];

  for (const row of rows) {
    const currentOrder = Number(row.display_order ?? 0);

    if (!Number.isInteger(currentOrder) || currentOrder <= 0) {
      continue;
    }

    const { error: updateError } = asMaterialOrderQueryResult(
      await asMaterialOrderQuery(supabase.from("materials"))
        .update({ display_order: currentOrder + 1 })
        .eq("id", row.id)
    );

    if (updateError) {
      throw new Error("Nao foi possivel abrir espaco na ordenacao da categoria.");
    }
  }
}

async function decrementOrdersAfterPosition(
  supabase: SupabaseLike,
  categoryId: string,
  afterPosition: number,
  excludeMaterialId?: string
) {
  let query = asMaterialOrderQuery(supabase.from("materials"))
    .select("id, display_order")
    .eq("category_id", categoryId)
    .gt("display_order", afterPosition)
    .order("display_order", { ascending: true });

  if (excludeMaterialId) {
    query = query.neq("id", excludeMaterialId);
  }

  const { data, error } = asMaterialOrderQueryResult(await query);

  if (error) {
    throw new Error("Nao foi possivel compactar a ordenacao da categoria.");
  }

  const rows = data ?? [];

  for (const row of rows) {
    const currentOrder = Number(row.display_order ?? 0);

    if (!Number.isInteger(currentOrder) || currentOrder <= 0) {
      continue;
    }

    const { error: updateError } = asMaterialOrderQueryResult(
      await asMaterialOrderQuery(supabase.from("materials"))
        .update({ display_order: currentOrder - 1 })
        .eq("id", row.id)
    );

    if (updateError) {
      throw new Error("Nao foi possivel reajustar a ordem dos materiais.");
    }
  }
}

async function shiftRangeUp(
  supabase: SupabaseLike,
  categoryId: string,
  startInclusive: number,
  endExclusive: number,
  excludeMaterialId: string
) {
  const { data, error } = asMaterialOrderQueryResult(
    await asMaterialOrderQuery(supabase.from("materials"))
      .select("id, display_order")
      .eq("category_id", categoryId)
      .gte("display_order", startInclusive)
      .lt("display_order", endExclusive)
      .neq("id", excludeMaterialId)
      .order("display_order", { ascending: false })
  );

  if (error) {
    throw new Error("Nao foi possivel mover os materiais para baixo.");
  }

  const rows = data ?? [];

  for (const row of rows) {
    const currentOrder = Number(row.display_order ?? 0);

    if (!Number.isInteger(currentOrder) || currentOrder <= 0) {
      continue;
    }

    const { error: updateError } = asMaterialOrderQueryResult(
      await asMaterialOrderQuery(supabase.from("materials"))
        .update({ display_order: currentOrder + 1 })
        .eq("id", row.id)
    );

    if (updateError) {
      throw new Error("Nao foi possivel reorganizar os materiais da categoria.");
    }
  }
}

async function shiftRangeDown(
  supabase: SupabaseLike,
  categoryId: string,
  startExclusive: number,
  endInclusive: number,
  excludeMaterialId: string
) {
  const { data, error } = asMaterialOrderQueryResult(
    await asMaterialOrderQuery(supabase.from("materials"))
      .select("id, display_order")
      .eq("category_id", categoryId)
      .gt("display_order", startExclusive)
      .lte("display_order", endInclusive)
      .neq("id", excludeMaterialId)
      .order("display_order", { ascending: true })
  );

  if (error) {
    throw new Error("Nao foi possivel mover os materiais para cima.");
  }

  const rows = data ?? [];

  for (const row of rows) {
    const currentOrder = Number(row.display_order ?? 0);

    if (!Number.isInteger(currentOrder) || currentOrder <= 0) {
      continue;
    }

    const { error: updateError } = asMaterialOrderQueryResult(
      await asMaterialOrderQuery(supabase.from("materials"))
        .update({ display_order: currentOrder - 1 })
        .eq("id", row.id)
    );

    if (updateError) {
      throw new Error("Nao foi possivel reorganizar os materiais da categoria.");
    }
  }
}

export function parseRequestedDisplayOrder(value: unknown) {
  return parsePositiveInteger(value);
}

export async function resolveDisplayOrderForCreate(
  supabase: SupabaseLike,
  categoryId: string,
  requestedDisplayOrder: number | null
) {
  const maxOrder = await getMaxDisplayOrder(supabase, categoryId);
  const finalDisplayOrder = requestedDisplayOrder
    ? clampPosition(requestedDisplayOrder, maxOrder + 1)
    : maxOrder + 1;

  if (finalDisplayOrder <= maxOrder) {
    await incrementOrdersFromPosition(supabase, categoryId, finalDisplayOrder);
  }

  return finalDisplayOrder;
}

export async function resolveDisplayOrderForUpdate(
  supabase: SupabaseLike,
  params: {
    materialId: string;
    currentCategoryId: string;
    currentDisplayOrder: number | null;
    nextCategoryId: string;
    requestedDisplayOrder: number | null;
  }
) {
  const {
    materialId,
    currentCategoryId,
    currentDisplayOrder,
    nextCategoryId,
    requestedDisplayOrder,
  } = params;

  const safeCurrentOrder =
    Number.isInteger(currentDisplayOrder) && Number(currentDisplayOrder) > 0
      ? Number(currentDisplayOrder)
      : null;

  if (currentCategoryId !== nextCategoryId) {
    if (safeCurrentOrder) {
      await decrementOrdersAfterPosition(
        supabase,
        currentCategoryId,
        safeCurrentOrder,
        materialId
      );
    }

    const maxOrderInNextCategory = await getMaxDisplayOrder(
      supabase,
      nextCategoryId,
      materialId
    );

    const finalDisplayOrder = requestedDisplayOrder
      ? clampPosition(requestedDisplayOrder, maxOrderInNextCategory + 1)
      : maxOrderInNextCategory + 1;

    if (finalDisplayOrder <= maxOrderInNextCategory) {
      await incrementOrdersFromPosition(
        supabase,
        nextCategoryId,
        finalDisplayOrder,
        materialId
      );
    }

    return finalDisplayOrder;
  }

  const maxOrderWithoutSelf = await getMaxDisplayOrder(
    supabase,
    nextCategoryId,
    materialId
  );

  if (!safeCurrentOrder) {
    const finalDisplayOrder = requestedDisplayOrder
      ? clampPosition(requestedDisplayOrder, maxOrderWithoutSelf + 1)
      : maxOrderWithoutSelf + 1;

    if (finalDisplayOrder <= maxOrderWithoutSelf) {
      await incrementOrdersFromPosition(
        supabase,
        nextCategoryId,
        finalDisplayOrder,
        materialId
      );
    }

    return finalDisplayOrder;
  }

  const finalDisplayOrder = requestedDisplayOrder
    ? clampPosition(requestedDisplayOrder, maxOrderWithoutSelf + 1)
    : safeCurrentOrder;

  if (finalDisplayOrder === safeCurrentOrder) {
    return safeCurrentOrder;
  }

  if (finalDisplayOrder < safeCurrentOrder) {
    await shiftRangeUp(
      supabase,
      nextCategoryId,
      finalDisplayOrder,
      safeCurrentOrder,
      materialId
    );

    return finalDisplayOrder;
  }

  await shiftRangeDown(
    supabase,
    nextCategoryId,
    safeCurrentOrder,
    finalDisplayOrder,
    materialId
  );

  return finalDisplayOrder;
}
