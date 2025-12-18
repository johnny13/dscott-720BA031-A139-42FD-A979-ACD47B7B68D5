import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from '../services/tasks.service';
import { AuditService } from '../services/audit.service';
import { Task, Organization } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Organization])],
  controllers: [TasksController],
  providers: [TasksService, AuditService],
  exports: [AuditService],
})
export class TasksModule {}

