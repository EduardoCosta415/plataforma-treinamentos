import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { StudentsModule } from './modules/students/student.module';
import { CoursesModule } from './modules/courses/courses.module';
import { StudentCoursesModule } from './modules/student-courses/student-courses.module';
import { CourseModulesModule } from './modules/courses-modules/course-modules.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { ImportModule } from './modules/import/import.module';
import { ProgressModule } from './modules/progress/progress.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExamsModule } from './modules/exams/exams.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { LibraryModule } from './modules/library/library.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    StudentsModule,
    CoursesModule,
    StudentCoursesModule,
    CourseModulesModule,
    LessonsModule,
    ImportModule,
    ProgressModule,
    DashboardModule,
    ExamsModule,
    CertificatesModule,
    LibraryModule,
  ],
})
export class AppModule {}
