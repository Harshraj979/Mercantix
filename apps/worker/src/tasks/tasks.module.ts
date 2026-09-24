import { Module } from '@nestjs/common';
import { MaintenanceTasksService } from './maintenance-tasks.service';

@Module({
  providers: [MaintenanceTasksService],
  exports: [MaintenanceTasksService],
})
export class TasksModule {}
