import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, type Resolver, type UseFormReturn, useForm } from "react-hook-form";
import type { z } from "zod";

/**
 * `useForm` with the zod resolver and the project defaults: errors appear when a field is left
 * (`onTouched`), then update as the person types; typed values are always kept on errors; the
 * first invalid field takes focus on submit.
 *
 * Field values are the strings inputs hold (`z.input`); the submit handler receives the parsed
 * output (`z.output`): numbers as numbers, phones as E.164, dates as ISO strings.
 */
export function useAppForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  defaultValues: z.input<S>,
): UseFormReturn<z.input<S>, unknown, z.output<S>> {
  return useForm<z.input<S>, unknown, z.output<S>>({
    // The resolver is typed for a concrete schema; the generic S is only known to be a zod type here.
    resolver: zodResolver(schema) as unknown as Resolver<z.input<S>, unknown, z.output<S>>,
    defaultValues: defaultValues as never,
    mode: "onTouched",
    shouldFocusError: true,
  });
}
