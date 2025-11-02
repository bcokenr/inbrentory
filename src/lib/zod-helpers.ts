import { z } from "zod";

export const requiredNumber = (opts?: { min?: number; message?: string }) =>
  z
    .coerce
    .number({
      message: "Must be a number",
    })
    .refine((val) => (opts?.min !== undefined ? val > opts.min : true), {
      message: opts?.message ?? "Must be greater than zero",
    });

export const emptySafeNumber = (opts?: { min?: number; message?: string }) =>
  z
    .union([
      z
        .coerce
        .number()
        .refine((val) => (opts?.min !== undefined ? val > opts.min : true), {
          message: opts?.message ?? "Must be greater than zero",
        }),
      z.literal(""),
    ])
    .transform((val) => (val === "" ? undefined : val));