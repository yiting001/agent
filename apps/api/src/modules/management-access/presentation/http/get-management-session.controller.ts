import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ManagementPrincipal } from '../../domain/management-access';
import {
  AuditManagementAction,
  CurrentManagementPrincipal,
  RequireManagementScopes,
} from './management-access.decorators';

@ApiTags('management-access')
@Controller('management-access')
export class GetManagementSessionController {
  @Get('session')
  @RequireManagementScopes()
  @AuditManagementAction({
    action: 'management.session.read',
    resourceType: 'management-session',
  })
  @ApiOperation({ summary: 'Return the authenticated management subject' })
  execute(
    @CurrentManagementPrincipal() principal: ManagementPrincipal,
  ): ManagementPrincipal {
    return {
      scopes: [...principal.scopes],
      subject: principal.subject,
    };
  }
}
