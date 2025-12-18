// Based on backend Task entity and DTOs
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TaskCategory {
  WORK = 'Work',
  PERSONAL = 'Personal',
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  category: TaskCategory;
  status?: TaskStatus;
  userId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  category?: TaskCategory;
  status?: TaskStatus;
  userId?: string;
}

