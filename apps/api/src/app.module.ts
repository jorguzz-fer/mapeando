import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AuthGuard } from './common/auth.guard.js';
import { AiController } from './modules/ai/ai.controller.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { ClientsController } from './modules/clients/clients.controller.js';
import { DashboardController } from './modules/dashboard/dashboard.controller.js';
import { GeoController } from './modules/geo/geo.controller.js';
import { TripsController } from './modules/trips/trips.controller.js';
import { SpaController } from './spa.controller.js';

@Module({
  controllers: [
    AppController,
    AuthController,
    ClientsController,
    DashboardController,
    GeoController,
    TripsController,
    AiController,
    // catch-all do SPA — deve ser o ÚLTIMO (rota curinga @Get('*'))
    SpaController,
  ],
  providers: [AuthGuard],
})
export class AppModule {}
