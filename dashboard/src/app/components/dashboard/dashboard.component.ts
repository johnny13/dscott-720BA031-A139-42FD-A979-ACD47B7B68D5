import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TasksService } from '../../services/tasks.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { Task, TaskStatus, TaskCategory, CreateTaskDto } from '../../models/task.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  // View mode: 'list' or 'board'
  viewMode = signal<'list' | 'board'>('board');
  
  // Filters - using signals for reactivity
  categoryFilter = signal<TaskCategory | 'all'>('all');
  statusFilter = signal<TaskStatus | 'all'>('all');
  
  // Create task modal
  showCreateModal = signal(false);
  newTask: CreateTaskDto = {
    title: '',
    description: '',
    category: TaskCategory.WORK,
    status: TaskStatus.TODO,
  };
  creating = false;
  error = '';

  // Computed filtered tasks
  filteredTasks = computed(() => {
    let tasks = this.tasksService.tasks();
    const categoryFilter = this.categoryFilter();
    const statusFilter = this.statusFilter();
    
    if (categoryFilter !== 'all') {
      tasks = tasks.filter(t => t.category === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
      tasks = tasks.filter(t => t.status === statusFilter);
    }
    
    return tasks;
  });

  // Tasks by status for board view (uses filtered tasks)
  tasksByStatus = computed(() => {
    const tasks = this.filteredTasks();
    return {
      todo: tasks.filter(t => t.status === TaskStatus.TODO),
      in_progress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
      done: tasks.filter(t => t.status === TaskStatus.DONE),
    };
  });

  constructor(
    public tasksService: TasksService,
    public themeService: ThemeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.tasksService.loadTasks().subscribe();
  }

  toggleViewMode(): void {
    this.viewMode.update(mode => mode === 'list' ? 'board' : 'list');
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.newTask = {
      title: '',
      description: '',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
    };
    this.error = '';
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.error = '';
  }

  createTask(): void {
    if (!this.newTask.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    this.creating = true;
    this.error = '';

    this.tasksService.createTask(this.newTask).subscribe({
      next: () => {
        this.closeCreateModal();
        this.creating = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create task';
        this.creating = false;
      },
    });
  }

  updateTaskStatus(task: Task, newStatus: TaskStatus): void {
    // Optimistically update the local state first for immediate feedback
    const current = this.tasksService.tasksSignalForUpdate();
    const optimisticTask = { ...task, status: newStatus };
    const updated = current.map(t => t.id === task.id ? optimisticTask : t);
    this.tasksService.tasksSignalForUpdate.set(updated);
    
    // Then update via API
    this.tasksService.updateTask(task.id, { status: newStatus }).subscribe({
      next: (updatedTask) => {
        // Update with server response to ensure consistency
        const currentAfter = this.tasksService.tasksSignalForUpdate();
        const final = currentAfter.map(t => t.id === task.id ? updatedTask : t);
        this.tasksService.tasksSignalForUpdate.set(final);
      },
      error: (err) => {
        // Revert on error
        console.error('Failed to update task status:', err);
        this.tasksService.loadTasks().subscribe(); // Reload to get correct state
      }
    });
  }

  deleteTask(task: Task): void {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.tasksService.deleteTask(task.id).subscribe();
    }
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      // Same container - just reorder (optional, we can skip this for now)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Different container - get task from previous container
      const task = event.previousContainer.data[event.previousIndex];
      let newStatus: TaskStatus;
      
      // Determine new status from container ID
      if (event.container.id === 'todo-list') {
        newStatus = TaskStatus.TODO;
      } else if (event.container.id === 'in-progress-list') {
        newStatus = TaskStatus.IN_PROGRESS;
      } else if (event.container.id === 'done-list') {
        newStatus = TaskStatus.DONE;
      } else {
        return; // Unknown container
      }
      
      // Only update if status actually changed
      if (task.status !== newStatus) {
        // Update task status - this will trigger signal update and UI refresh
        // The computed tasksByStatus() will automatically update and show the task in the correct column
        this.updateTaskStatus(task, newStatus);
      }
      
      // Note: We don't need transferArrayItem here because:
      // 1. The signal update will cause tasksByStatus() to recompute
      // 2. The task will appear in the correct column automatically
      // 3. CDK handles the visual drag preview, so the user sees the drag happening
    }
  }

  logout(): void {
    this.authService.removeToken();
    this.router.navigate(['/login']);
  }

  // Enum getters for template
  TaskStatus = TaskStatus;
  TaskCategory = TaskCategory;
}

