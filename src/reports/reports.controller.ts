import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Reporte de matrículas por estudiante' })
  @Get('student-enrollments')
  getStudentEnrollmentReport() {
    return this.reportsService.getStudentEnrollmentReport();
  }

  @ApiOperation({ summary: 'Reporte de estudiantes por carrera' })
  @Get('students-by-career')
  getStudentsByCareerReport() {
    return this.reportsService.getStudentsByCareerReport();
  }

  @ApiOperation({ summary: 'Carga académica de profesores' })
  @Get('teacher-workload')
  getTeacherWorkloadReport() {
    return this.reportsService.getTeacherWorkloadReport();
  }

  @ApiOperation({ summary: 'Estadísticas generales' })
  @Get('system-statistics')
  getSystemStatistics() {
    return this.reportsService.getSystemStatistics();
  }
}
