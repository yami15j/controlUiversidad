import { Controller, Get, Query, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QueriesService } from './queries.service';

@ApiTags('Advanced Queries')
@Controller('queries')
export class QueriesController {
    constructor(private readonly queriesService: QueriesService) { }

    @ApiOperation({ summary: 'Buscar estudiantes con filtros lógicos (AND)' })
    @ApiQuery({ name: 'careerId', required: true, type: Number })
    @ApiQuery({ name: 'cycleNumber', required: true, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @Get('students/logical-filters')
    findStudentsWithLogicalFilters(
        @Query('careerId', ParseIntPipe) careerId: number,
        @Query('cycleNumber', ParseIntPipe) cycleNumber: number,
        @Query('status') status?: string
    ) {
        return this.queriesService.findStudentsWithLogicalFilters({
            careerId,
            cycleNumber,
            status: status || 'active'
        });
    }

    @ApiOperation({ summary: 'Buscar estudiantes en múltiples ciclos (OR)' })
    @ApiQuery({ name: 'cycles', required: true, type: String, description: 'Ej: 1,2,3' })
    @ApiQuery({ name: 'careerId', required: false, type: Number })
    @Get('students/multiple-cycles')
    findStudentsByMultipleCycles(
        @Query('cycles') cycles: string,
        @Query('careerId') careerId?: string
    ) {
        if (!cycles) {
            throw new BadRequestException('El parámetro cycles es requerido');
        }
        const cycleArray = cycles.split(',').map(c => parseInt(c, 10)).filter(n => !isNaN(n));
        if (cycleArray.length === 0) {
            throw new BadRequestException('Cycles debe contener números válidos separados por comas');
        }
        return this.queriesService.findStudentsByMultipleCycles(
            cycleArray,
            careerId ? parseInt(careerId, 10) : undefined
        );
    }

    @ApiOperation({ summary: 'Estudiantes excluyendo estados (NOT)' })
    @ApiQuery({ name: 'excludedStatuses', required: true, type: String, description: 'Ej: suspended,withdrawn' })
    @ApiQuery({ name: 'careerId', required: false, type: Number })
    @Get('students/exclude-statuses')
    findActiveStudentsExcludingStatuses(
        @Query('excludedStatuses') excludedStatuses: string,
        @Query('careerId') careerId?: string
    ) {
        if (!excludedStatuses) {
            throw new BadRequestException('El parámetro excludedStatuses es requerido');
        }
        const statusArray = excludedStatuses.split(',');
        return this.queriesService.findActiveStudentsExcludingStatuses(
            statusArray,
            careerId ? parseInt(careerId, 10) : undefined
        );
    }

    @ApiOperation({ summary: 'Consulta compleja (AND + OR + NOT)' })
    @ApiQuery({ name: 'careerIds', required: true, type: String, description: 'Ej: 1,2' })
    @ApiQuery({ name: 'excludeCycles', required: true, type: String, description: 'Ej: 1,2' })
    @ApiQuery({ name: 'status', required: false, type: String, default: 'active' })
    @Get('students/complex-logic')
    findStudentsWithComplexLogic(
        @Query('careerIds') careerIds: string,
        @Query('excludeCycles') excludeCycles: string,
        @Query('status') status: string = 'active'
    ) {
        if (!careerIds || !excludeCycles) {
            throw new BadRequestException('Los parámetros careerIds y excludeCycles son requeridos');
        }

        const careerIdsArray = careerIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
        const excludeCyclesArray = excludeCycles.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));

        return this.queriesService.findStudentsWithComplexLogic({
            careerIds: careerIdsArray,
            excludeCycles: excludeCyclesArray,
            status
        });
    }
}