import { Controller, Get, Patch, Param, Delete, Query, Body, ParseIntPipe } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PaginationDto } from 'src/pagination/pagination.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Teachers')
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) { }

  @ApiOperation({ summary: 'Get all teachers' })
  @Get()
  findAll(@Query() findWithPagination: PaginationDto) {
    return this.teacherService.findAll(findWithPagination);
  }

  @ApiOperation({ summary: 'Get teachers with multiple subjects' })
  @Get('multiple-subjects')
  findTeachersWithMultipleSubjects(@Query() paginationDto: PaginationDto) {
    return this.teacherService.findTeachersWithMultipleSubjects(paginationDto);
  }

  @ApiOperation({ summary: 'Get a teacher by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teacherService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a teacher profile' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teacherService.update(id, updateTeacherDto);
  }

  @ApiOperation({ summary: 'Delete a teacher' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teacherService.remove(id);
  }
}
