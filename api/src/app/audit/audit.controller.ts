import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccessGuard } from '../guards/access.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User, UserRole } from '../entities';
import { AuditService } from '../services/audit.service';

@ApiTags('audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit-log')
@UseGuards(JwtAuthGuard, AccessGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs (Owner and Admin only)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Owners and Admins can access' })
  getAuditLogs(@CurrentUser() user: User) {
    return this.auditService.getLogs(user.role, user.organizationId);
  }
}

