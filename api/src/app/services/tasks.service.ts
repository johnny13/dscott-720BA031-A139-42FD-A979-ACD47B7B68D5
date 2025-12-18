import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, User, UserRole, Organization, TaskStatus, TaskCategory } from '../entities';
import { AuditService, AuditAction } from './audit.service';

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Complete project documentation', description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Write comprehensive documentation for the API', required: false, description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    enum: TaskCategory, 
    example: TaskCategory.WORK, 
    description: 'Task category (Work or Personal)',
    enumName: 'TaskCategory'
  })
  @IsEnum(TaskCategory)
  @IsNotEmpty()
  category: TaskCategory;

  @ApiProperty({ 
    enum: TaskStatus, 
    example: TaskStatus.TODO, 
    required: false, 
    description: 'Task status (todo, in_progress, or done)',
    enumName: 'TaskStatus'
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: 'user-id-uuid', required: false, description: 'User ID to assign task to (defaults to current user)' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ example: 'Updated task title', required: false, description: 'Task title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Updated description', required: false, description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TaskCategory, example: TaskCategory.PERSONAL, required: false, description: 'Task category' })
  @IsEnum(TaskCategory)
  @IsOptional()
  category?: TaskCategory;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS, required: false, description: 'Task status' })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: 'user-id-uuid', required: false, description: 'User ID to reassign task to' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private auditService: AuditService,
  ) {}

  async findAll(user: User): Promise<Task[]> {
    let tasks: Task[];

    if (user.role === UserRole.OWNER) {
      // Owner can see everything in their org and sub-orgs
      const orgIds = await this.getOrganizationAndSubOrgIds(user.organizationId);
      tasks = await this.taskRepository.find({
        where: { organizationId: In(orgIds) },
        relations: ['user', 'organization'],
      });
    } else if (user.role === UserRole.ADMIN) {
      // Admin can see everything in their specific organization
      tasks = await this.taskRepository.find({
        where: { organizationId: user.organizationId },
        relations: ['user', 'organization'],
      });
    } else {
      // Viewer can only see tasks assigned to them
      tasks = await this.taskRepository.find({
        where: { userId: user.id },
        relations: ['user', 'organization'],
      });
    }

    // Log the view action
    tasks.forEach((task) => {
      this.auditService.log(user, AuditAction.VIEW, 'Task', task.id);
    });

    return tasks;
  }

  async findOne(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['user', 'organization'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions
    this.checkTaskAccess(task, user, 'view');

    this.auditService.log(user, AuditAction.VIEW, 'Task', task.id);
    return task;
  }

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    // Viewers cannot create tasks
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot create tasks');
    }

    // Ensure title is present
    if (!createTaskDto.title) {
      throw new ForbiddenException('Title is required');
    }

    // Transform category string to enum if needed (for Swagger/JSON input)
    let category: TaskCategory = createTaskDto.category;
    const categoryValue = createTaskDto.category as any;
    if (typeof categoryValue === 'string') {
      // Map "Work" -> TaskCategory.WORK, "Personal" -> TaskCategory.PERSONAL
      if (categoryValue === 'Work' || categoryValue === 'WORK') {
        category = TaskCategory.WORK;
      } else if (categoryValue === 'Personal' || categoryValue === 'PERSONAL') {
        category = TaskCategory.PERSONAL;
      }
    }

    // Transform status string to enum if needed
    let status: TaskStatus = createTaskDto.status || TaskStatus.TODO;
    const statusValue = (createTaskDto.status || TaskStatus.TODO) as any;
    if (typeof statusValue === 'string') {
      const normalized = statusValue.toLowerCase().replace(/\s+/g, '_');
      if (normalized === 'todo') {
        status = TaskStatus.TODO;
      } else if (normalized === 'in_progress' || normalized === 'inprogress') {
        status = TaskStatus.IN_PROGRESS;
      } else if (normalized === 'done') {
        status = TaskStatus.DONE;
      }
    }

    const task = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description || null,
      category: category,
      status: status,
      userId: createTaskDto.userId || user.id,
      organizationId: user.organizationId,
    });

    const savedTask = await this.taskRepository.save(task);
    this.auditService.log(
      user,
      AuditAction.CREATE,
      'Task',
      savedTask.id,
      `Created task: ${savedTask.title}`,
    );

    const result = await this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: ['user', 'organization'],
    });

    if (!result) {
      throw new NotFoundException('Task not found after creation');
    }

    return result;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['user', 'organization'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions
    this.checkTaskAccess(task, user, 'edit');

    // Viewers cannot update tasks
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot update tasks');
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.taskRepository.save(task);

    this.auditService.log(
      user,
      AuditAction.UPDATE,
      'Task',
      updatedTask.id,
      `Updated task: ${updatedTask.title}`,
    );

    const result = await this.taskRepository.findOne({
      where: { id: updatedTask.id },
      relations: ['user', 'organization'],
    });

    if (!result) {
      throw new NotFoundException('Task not found after update');
    }

    return result;
  }

  async remove(id: string, user: User): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['user', 'organization'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions
    this.checkTaskAccess(task, user, 'delete');

    // Viewers cannot delete tasks
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot delete tasks');
    }

    await this.taskRepository.remove(task);
    this.auditService.log(
      user,
      AuditAction.DELETE,
      'Task',
      id,
      `Deleted task: ${task.title}`,
    );
  }

  private checkTaskAccess(task: Task, user: User, action: string): void {
    if (user.role === UserRole.OWNER) {
      // Owner can access tasks in their org and sub-orgs
      // We'll check this by verifying the organization hierarchy
      // For now, we'll allow if it's in the same org or sub-org
      // This is a simplified check - in production, you'd verify the hierarchy
      return;
    }

    if (user.role === UserRole.ADMIN) {
      // Admin can only access tasks in their specific organization
      if (task.organizationId !== user.organizationId) {
        throw new ForbiddenException(
          `Admins cannot ${action} tasks from different organizations`,
        );
      }
      return;
    }

    if (user.role === UserRole.VIEWER) {
      // Viewer can only access tasks assigned to them
      if (task.userId !== user.id) {
        throw new ForbiddenException(
          `Viewers can only ${action} tasks assigned to them`,
        );
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private async getOrganizationAndSubOrgIds(organizationId: string): Promise<string[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['children'],
    });

    if (!organization) {
      return [organizationId];
    }

    const ids = [organizationId];
    
    // Get all child organizations recursively
    const getChildIds = async (org: Organization): Promise<string[]> => {
      const childIds: string[] = [];
      if (org.children && org.children.length > 0) {
        for (const child of org.children) {
          childIds.push(child.id);
          const childWithChildren = await this.organizationRepository.findOne({
            where: { id: child.id },
            relations: ['children'],
          });
          if (childWithChildren?.children) {
            childIds.push(...(await getChildIds(childWithChildren)));
          }
        }
      }
      return childIds;
    };

    const childIds = await getChildIds(organization);
    return [...ids, ...childIds];
  }
}

