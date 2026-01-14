import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollmentDto {
    @ApiProperty({ description: 'ID of the student' })
    @IsInt()
    @IsNotEmpty()
    studentId: number;

    @ApiProperty({ description: 'ID of the subject' })
    @IsInt()
    @IsNotEmpty()
    subjectId: number;
}
