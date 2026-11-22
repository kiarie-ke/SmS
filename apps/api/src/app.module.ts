import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { GuardiansModule } from "./people/guardians/guardians.module";
import { StudentsModule } from "./people/students/students.module";
import { TeachersModule } from "./people/teachers/teachers.module";
import { UsersModule } from "./people/users/users.module";
import { AcademicYearsModule } from "./structure/academic-years/academic-year.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { ExamsModule } from "./exams/exam.module";
import { CbcModule } from "./cbc/cbc.module";
import { ReportCardsModule } from "./report-cards/report-card.module";
import { FeesModule } from "./fees/fee.module";
import { NotificationsModule } from "./notifications/notification.module";
import { AuditModule } from "./audit/audit.module";
import { SmsModule } from "./sms/sms.module";
import { ReportsModule } from "./reports/report.module";
import { SchoolSettingsModule } from "./school-settings/school-settings.module";
import { FinanceModule } from "./finance/finance.module";
import { LibraryModule } from "./library/library.module";
import { OperationsModule } from "./operations/operations.module";
import { ClassesModule } from "./structure/classes/class.module";
import { StreamsModule } from "./structure/streams/stream.module";
import { SubjectsModule } from "./structure/subjects/subject.module";
import { TermsModule } from "./structure/terms/term.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { CsrfGuard } from "./common/guards/csrf.guard";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response.interceptor";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { envValidationSchema } from "./config/env.validation";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
          "req.body.password",
          "req.body.currentPassword",
          "req.body.newPassword",
        ],
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    PrismaModule,
    AuthModule,
    StudentsModule,
    GuardiansModule,
    TeachersModule,
    UsersModule,
    AcademicYearsModule,
    TermsModule,
    ClassesModule,
    StreamsModule,
    SubjectsModule,
    AttendanceModule,
    ExamsModule,
    CbcModule,
    ReportCardsModule,
    FeesModule,
    NotificationsModule,
    AuditModule,
    SmsModule,
    ReportsModule,
    SchoolSettingsModule,
    FinanceModule,
    LibraryModule,
    OperationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
