import { PartialType } from '@nestjs/swagger';

import { CreateKnowledgeEntryDto } from './create-knowledge-entry.dto';

/** HTTP payload accepted when editing a knowledge entry; all fields optional. */
export class UpdateKnowledgeEntryDto extends PartialType(
  CreateKnowledgeEntryDto,
) {}
