"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, unwrap } from "@/lib/action";
import { uuid } from "@/lib/validation";
import {
  categorySchema,
  certificateSchema,
  kosherBodySchema,
  kosherLevelSchema,
  locationSchema,
  locationTypeSchema,
  productSchema,
  supplierSchema,
  warehouseSchema,
} from "./schemas";

// Catalogue tables and their schemas. Writes are limited to these tables and are
// re-checked by RLS (admin / store_manager).
const ENTITIES = {
  categories: { schema: categorySchema, paths: ["/categories", "/products"] },
  kosher_levels: { schema: kosherLevelSchema, paths: ["/kosher"] },
  kosher_bodies: { schema: kosherBodySchema, paths: ["/kosher"] },
  kosher_certificates: { schema: certificateSchema, paths: ["/kosher", "/batches"] },
  suppliers: { schema: supplierSchema, paths: ["/suppliers"] },
  warehouses: { schema: warehouseSchema, paths: ["/warehouses", "/locations"] },
  location_types: { schema: locationTypeSchema, paths: ["/locations"] },
  storage_locations: { schema: locationSchema, paths: ["/locations", "/warehouses"] },
  products: { schema: productSchema, paths: ["/products", "/inventory"] },
} as const;

export type EntityName = keyof typeof ENTITIES;

const idSchema = z.object({ id: uuid() });

async function save(entity: EntityName, id: string | null, input: unknown) {
  const { schema, paths } = ENTITIES[entity];
  return runAction("catalog.manage", schema, input, async (data, { supabase }) => {
    const table = supabase.from(entity);
    const row = id
      ? unwrap(await table.update(data as never).eq("id", id).select("id").single())
      : unwrap(await table.insert(data as never).select("id").single());
    paths.forEach((p) => revalidatePath(p));
    return row as { id: string };
  });
}

export async function saveEntity(entity: EntityName, id: string | null, input: unknown) {
  if (!(entity in ENTITIES)) return { ok: false as const, error: "ישות לא מוכרת" };
  return save(entity, id, input);
}

export async function setEntityActive(entity: EntityName, id: string, isActive: boolean) {
  if (!(entity in ENTITIES)) return { ok: false as const, error: "ישות לא מוכרת" };
  return runAction("catalog.manage", idSchema, { id }, async ({ id }, { supabase }) => {
    unwrap(await supabase.from(entity).update({ is_active: isActive } as never).eq("id", id).select("id").single());
    ENTITIES[entity].paths.forEach((p) => revalidatePath(p));
    return null;
  });
}

/** Hard delete — only succeeds for records nothing references (FK restrict). */
export async function deleteEntity(entity: EntityName, id: string) {
  if (!(entity in ENTITIES)) return { ok: false as const, error: "ישות לא מוכרת" };
  return runAction("catalog.manage", idSchema, { id }, async ({ id }, { supabase }) => {
    const res = await supabase.from(entity).delete().eq("id", id).select("id");
    if (res.error) throw res.error;
    if (!res.data?.length) throw { code: "42501" };
    ENTITIES[entity].paths.forEach((p) => revalidatePath(p));
    return null;
  });
}

/** Stores the product image path after the browser uploaded the file to Storage. */
export async function setProductImage(productId: string, path: string | null) {
  return runAction(
    "catalog.manage",
    z.object({ id: uuid(), path: z.string().max(300).nullable() }),
    { id: productId, path },
    async ({ id, path }, { supabase }) => {
      const old = unwrap(await supabase.from("products").select("image_path").eq("id", id).single());
      unwrap(await supabase.from("products").update({ image_path: path }).eq("id", id).select("id").single());
      if (old.image_path && old.image_path !== path) await supabase.storage.from("product-images").remove([old.image_path]);
      revalidatePath("/products");
      return null;
    },
  );
}

export async function setCertificateDocument(certificateId: string, path: string | null) {
  return runAction(
    "catalog.manage",
    z.object({ id: uuid(), path: z.string().max(300).nullable() }),
    { id: certificateId, path },
    async ({ id, path }, { supabase }) => {
      unwrap(await supabase.from("kosher_certificates").update({ document_path: path }).eq("id", id).select("id").single());
      revalidatePath("/kosher");
      return null;
    },
  );
}
