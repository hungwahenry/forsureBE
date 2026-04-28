import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_ENVELOPE = 'skipResponseEnvelope';

/** Apply to controllers/handlers whose responses must be returned raw (e.g. health, file streams). */
export const SkipResponseEnvelope = () =>
  SetMetadata(SKIP_RESPONSE_ENVELOPE, true);
