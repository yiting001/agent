import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { managementSecurityConfig } from '../../config/management-security.config';
import { ManagementAuditRepository } from './application/management-audit.repository';
import { ManagementAuditService } from './application/management-audit.service';
import { ManagementAuthenticator } from './application/management-authenticator';
import { ConfigManagementAuthenticator } from './infrastructure/config-management-authenticator';
import { ManagementAuditLogEntity } from './infrastructure/management-audit-log.entity';
import { TypeOrmManagementAuditRepository } from './infrastructure/typeorm-management-audit.repository';
import { GetManagementSessionController } from './presentation/http/get-management-session.controller';
import { ManagementAccessGuard } from './presentation/http/management-access.guard';
import { ManagementAuditInterceptor } from './presentation/http/management-audit.interceptor';

@Module({
  controllers: [GetManagementSessionController],
  exports: [ManagementAuditService, ManagementAuthenticator],
  imports: [
    ConfigModule.forFeature(managementSecurityConfig),
    TypeOrmModule.forFeature([ManagementAuditLogEntity]),
  ],
  providers: [
    ManagementAuditService,
    {
      provide: APP_GUARD,
      useClass: ManagementAccessGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ManagementAuditInterceptor,
    },
    {
      provide: ManagementAuthenticator,
      useClass: ConfigManagementAuthenticator,
    },
    {
      provide: ManagementAuditRepository,
      useClass: TypeOrmManagementAuditRepository,
    },
  ],
})
export class ManagementAccessModule {}
