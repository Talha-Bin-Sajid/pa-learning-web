import { z } from 'zod';
import { EVIDENCE_TYPES, LIMITS } from '@/lib/forms';

/**
 * Evidence form rules. Mirrors the server (which also checks the real file type
 * from its bytes): date not in the future, file required for certificate items
 * unless one is already on record, ≤ 15 MB, PNG/JPG/WEBP/PDF.
 */
export function evidenceSchema(opts: { today: string; needsFile: boolean }) {
  return z
    .object({
      completedOn: z.string().min(1, 'Select the completion date'),
      reflection: z.string().max(LIMITS.reflectionMax, `At most ${LIMITS.reflectionMax} characters`),
      file: z.instanceof(File).nullable(),
    })
    .superRefine((v, ctx) => {
      if (v.completedOn && v.completedOn > opts.today) {
        ctx.addIssue({ code: 'custom', path: ['completedOn'], message: 'The date cannot be in the future' });
      }
      if (!v.file) {
        if (opts.needsFile) ctx.addIssue({ code: 'custom', path: ['file'], message: 'Attach a certificate or screenshot' });
        return;
      }
      if (v.file.size > LIMITS.evidenceMaxBytes) {
        ctx.addIssue({ code: 'custom', path: ['file'], message: 'The file is larger than 15 MB' });
      } else if (v.file.type && !(EVIDENCE_TYPES as readonly string[]).includes(v.file.type)) {
        ctx.addIssue({ code: 'custom', path: ['file'], message: 'Use a PNG, JPG, WEBP or PDF file' });
      }
    });
}

export type EvidenceValues = z.infer<ReturnType<typeof evidenceSchema>>;
