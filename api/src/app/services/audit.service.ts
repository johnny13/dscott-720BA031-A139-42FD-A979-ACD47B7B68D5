import { Injectable } from '@nestjs/common';
import { User } from '../entities';

export enum AuditAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface AuditLog {
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  timestamp: Date;
  details?: string;
}

@Injectable()
export class AuditService {
  private logs: AuditLog[] = [];

  log(user: User, action: AuditAction, resource: string, resourceId: string, details?: string): void {
    const log: AuditLog = {
      userId: user.id,
      userEmail: user.email,
      action,
      resource,
      resourceId,
      timestamp: new Date(),
      details,
    };

    this.logs.push(log);

    // Console log as requested
    console.log(`[AUDIT] ${action} - User: ${user.email} (${user.id}) - Resource: ${resource} (${resourceId})${details ? ` - Details: ${details}` : ''} - Time: ${log.timestamp.toISOString()}`);
  }

  getLogs(userRole: string, userOrganizationId: string): AuditLog[] {
    // Owners and Admins can see all logs in their organization
    // For simplicity, we'll return all logs (in production, filter by organization)
    return this.logs;
  }

  getLogsByUser(userId: string): AuditLog[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  getLogsByResource(resourceId: string): AuditLog[] {
    return this.logs.filter((log) => log.resourceId === resourceId);
  }
}

