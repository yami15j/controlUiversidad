import { Controller, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@ApiTags('Enrollment (Transaccional)')
@Controller('enrollment')
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) { }

    @ApiOperation({ summary: 'Matricular estudiante (ACID)' })
    @Post()
    enrollStudent(@Body() dto: CreateEnrollmentDto) {
        return this.enrollmentService.enrollStudentInSubject(dto);
    }

    @ApiOperation({ summary: 'Matriculación masiva (ACID)' })
    @Post('bulk')
    enrollStudentInMultiple(@Body() dto: { studentId: number; subjectIds: number[] }) {
        return this.enrollmentService.enrollStudentInMultipleSubjects(
            dto.studentId,
            dto.subjectIds,
        );
    }

    @ApiOperation({ summary: 'Cancelar matrícula (ACID)' })
    @Delete(':id')
    cancelEnrollment(@Param('id', ParseIntPipe) id: number) {
        return this.enrollmentService.cancelEnrollment(id);
    }
}
