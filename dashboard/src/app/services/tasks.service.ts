import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Task, CreateTaskDto, UpdateTaskDto } from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private apiUrl = 'http://localhost:3000/api';
  
  // State management with signals
  private tasksSignal = signal<Task[]>([]);
  public tasks = this.tasksSignal.asReadonly();
  
  // Expose signal for optimistic updates (read-only access)
  get tasksSignalForUpdate() {
    return this.tasksSignal;
  }
  
  // Computed signals for filtering
  public tasksByStatus = computed(() => {
    const tasks = this.tasksSignal();
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      done: tasks.filter(t => t.status === 'done'),
    };
  });

  constructor(private http: HttpClient) {}

  loadTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks`).pipe(
      tap(tasks => this.tasksSignal.set(tasks))
    );
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/tasks/${id}`);
  }

  createTask(task: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, task).pipe(
      tap(newTask => {
        const current = this.tasksSignal();
        this.tasksSignal.set([...current, newTask]);
      })
    );
  }

  updateTask(id: string, task: UpdateTaskDto): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}`, task).pipe(
      tap(updatedTask => {
        const current = this.tasksSignal();
        const updated = current.map(t => t.id === id ? updatedTask : t);
        this.tasksSignal.set([...updated]); // Create new array to trigger reactivity
      })
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`).pipe(
      tap(() => {
        const current = this.tasksSignal();
        this.tasksSignal.set(current.filter(t => t.id !== id));
      })
    );
  }

  // Helper method to refresh tasks
  refreshTasks(): void {
    this.loadTasks().subscribe();
  }
}

