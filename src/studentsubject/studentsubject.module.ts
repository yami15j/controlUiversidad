import { Module } from '@nestjs/common';
import { StudentsubjectService } from './studentsubject.service';
import { StudentsubjectController } from './studentsubject.controller';
import { SubjectModule } from 'src/subject/subject.module';
import { EnrollmentService } from './enrollment/enrollment.service';
import { EnrollmentController } from './enrollment/enrollment.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [StudentsubjectController, EnrollmentController],
  providers: [StudentsubjectService, EnrollmentService],
  imports: [SubjectModule, PrismaModule]
})
export class StudentsubjectModule { }
