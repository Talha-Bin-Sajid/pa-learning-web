import { z } from 'zod';
import { LIMITS, rules } from '@/lib/forms';
import type { LearningItem, Lookups } from '@/types/api';
import type { ItemInput } from './api';

/** Form values (strings straight from inputs). Mirrors backend `itemBody`. */
export const itemSchema = z
  .object({
    title: rules.requiredText('Enter an activity title', LIMITS.titleMax),
    categoryId: z.string().min(1, 'Choose a category'),
    cpdTypeId: z.string().min(1, 'Choose a CPD type'),
    deliveryTypeId: z.string().min(1, 'Choose a training type'),
    provider: rules.optionalText(LIMITS.providerMax),
    hours: z
      .string()
      .trim()
      .min(1, 'Enter the hours for this activity')
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter the hours for this activity')
      .refine((v) => Number(v) <= LIMITS.hoursMax, `At most ${LIMITS.hoursMax} hours`),
    dueDate: rules.optionalDate,
    isMandatory: z.enum(['yes', 'no']),
    evidenceMode: z.enum(['certificate', 'acknowledgement']),
    link: rules.link,
    description: rules.optionalText(LIMITS.descriptionMax),
    all: z.boolean(),
    designationIds: z.array(z.number()),
    profileIds: z.array(z.string()),
  })
  .refine((v) => v.all || v.designationIds.length > 0 || v.profileIds.length > 0, {
    path: ['designationIds'],
    message: 'Choose who this item is for',
  });

export type ItemFormValues = z.infer<typeof itemSchema>;

/** Fields on step 1 (Details) — validated before moving to step 2. */
export const DETAIL_FIELDS = [
  'title',
  'categoryId',
  'cpdTypeId',
  'deliveryTypeId',
  'provider',
  'hours',
  'dueDate',
  'isMandatory',
  'evidenceMode',
  'link',
  'description',
] as const satisfies readonly (keyof ItemFormValues)[];

export function itemDefaults(item: LearningItem | null, lookups: Lookups): ItemFormValues {
  return {
    title: item?.title ?? '',
    categoryId: String(item?.category.id ?? lookups.categories[0]?.id ?? ''),
    cpdTypeId: String(item?.cpdType.id ?? lookups.cpdTypes[0]?.id ?? ''),
    deliveryTypeId: String(item?.deliveryType.id ?? lookups.deliveryTypes[0]?.id ?? ''),
    provider: item?.provider ?? '',
    hours: item ? String(item.hours) : '',
    dueDate: item?.dueDate ?? '',
    isMandatory: item ? (item.isMandatory ? 'yes' : 'no') : 'yes',
    evidenceMode: item?.evidenceMode ?? 'certificate',
    link: item?.link ?? '',
    description: item?.description ?? '',
    all: item ? item.audience.all : true,
    designationIds: item?.audience.designations.map((d) => d.id) ?? [],
    profileIds: item?.audience.people.map((p) => p.id) ?? [],
  };
}

/** Validated form values → API request body. */
export function toItemInput(v: ItemFormValues): ItemInput {
  return {
    title: v.title,
    categoryId: Number(v.categoryId),
    cpdTypeId: Number(v.cpdTypeId),
    deliveryTypeId: Number(v.deliveryTypeId),
    provider: v.provider || null,
    hours: Number(v.hours),
    dueDate: v.dueDate || null,
    isMandatory: v.isMandatory === 'yes',
    evidenceMode: v.evidenceMode,
    link: v.link || null,
    description: v.description || null,
    audience: { all: v.all, designationIds: v.all ? [] : v.designationIds, profileIds: v.all ? [] : v.profileIds },
  };
}
