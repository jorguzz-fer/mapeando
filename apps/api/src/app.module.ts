import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AuthGuard } from './common/auth.guard.js';
import { AiController } from './modules/ai/ai.controller.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { ClientsController } from './modules/clients/clients.controller.js';
import { DashboardController } from './modules/dashboard/dashboard.controller.js';
import { TripsController } from './modules/trips/trips.controller.js';

@Module({
  controllers: [
    AppController,
    AuthController,
    ClientsController,
    DashboardController,
    TripsController,
    AiController,
  ],
  providers: [AuthGuard],
})
export class AppModule {}
