import { z } from "zod";

export const emptySafeNumber = (opts?: { min?: number; message?: string }) =>
  z.union([
    z
      .coerce
      .number()
      .refine((val) => (opts?.min ? val > opts.min : true), {
        message: opts?.message ?? "Must be greater than zero",
      }),
    z.literal(""),
  ])
  .transform((val) => (val === "" ? undefined : val));