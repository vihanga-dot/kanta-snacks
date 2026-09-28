import { z } from "zod";
import { createSnack, deleteSnack, getSiteSettings, listAllSnacks, listPublicSnacks, updateSiteSettings, updateSnack } from "../db";
import { storagePut } from "../storage";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const snackInput = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(100000),
  color: z.string().trim().min(1).max(64),
  weight: z.string().trim().max(32).nullable().optional(),
  imageUrl: z.string().trim().max(512).nullable().optional(),
  description: z.string().trim().min(1).max(4000),
  icon: z.string().trim().max(64).nullable().optional(),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});

const settingsInput = z.object({
  announcement: z.string().trim().min(1).max(180),
  heroTitle: z.string().trim().min(1).max(180),
  heroSubtitle: z.string().trim().min(1).max(4000),
  aboutTitle: z.string().trim().min(1).max(180),
  aboutBody: z.string().trim().min(1).max(4000),
});

export const catalogRouter = router({
  publicList: publicProcedure.query(() => listPublicSnacks()),
  publicSettings: publicProcedure.query(() => getSiteSettings()),
  adminList: adminProcedure.query(() => listAllSnacks()),
  adminSettings: adminProcedure.query(() => getSiteSettings()),
  create: adminProcedure.input(snackInput).mutation(({ input }) => createSnack(input)),
  update: adminProcedure.input(snackInput.extend({ id: z.number().int().positive() })).mutation(({ input }) => {
    const { id, ...changes } = input;
    return updateSnack(id, changes);
  }),
  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteSnack(input.id)),
  updateSettings: adminProcedure.input(settingsInput).mutation(({ input }) => updateSiteSettings(input)),
  uploadImage: adminProcedure.input(z.object({
    fileName: z.string().trim().min(1).max(180),
    contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
    dataBase64: z.string().min(1).max(8_000_000),
  })).mutation(async ({ input }) => {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const buffer = Buffer.from(input.dataBase64, "base64");
    if (buffer.length > 6 * 1024 * 1024) throw new Error("Image must be smaller than 6 MB");
    const uploaded = await storagePut(`kanta/snacks/${safeName}`, buffer, input.contentType);
    return uploaded;
  }),
});
