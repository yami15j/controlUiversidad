import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class StudentService {

  constructor(private readonly prisma: PrismaProfilesService) { }

  // ============================================
  // PARTE 1: CONSULTAS DERIVADAS
  // ============================================

  /**
   * 1. Listar todos los estudiantes activos junto con su carrera
   */
  async findActiveStudents(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.userReference.findMany({
          where: {
            roleId: 3, // STUDENT
            status: 'active' // Solo activos
          },
          skip,
          take: limit,
          include: {
            studentProfile: {
              include: {
                career: true, // Incluir carrera
                studentSubjects: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.userReference.count({
          where: {
            roleId: 3,
            status: 'active'
          }
        })
      ]);

      return {
        message: 'Estudiantes activos encontrados',
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al obtener estudiantes activos');
    }
  }

  /**
   * 4. Mostrar las matrículas de un estudiante en un período académico determinado
   * Nota: Como no tenemos cycleId en StudentSubject, filtramos por el ciclo actual del estudiante
   */
  async findStudentEnrollmentsByPeriod(studentId: number, cycleNumber?: number) {
    try {
      const student = await this.prisma.userReference.findUnique({
        where: { id: studentId },
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                where: cycleNumber ? {
                  subject: {
                    cicleNumber: cycleNumber
                  }
                } : undefined,
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      if (!student || student.roleId !== 3) {
        throw new NotFoundException('Estudiante no encontrado');
      }

      return {
        message: `Matrículas del estudiante ${student.name}`,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          career: student.studentProfile?.career,
          currentCycle: student.studentProfile?.currentCicle,
          enrollments: student.studentProfile?.studentSubjects || []
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener matrículas del estudiante');
    }
  }

  // ============================================
  // MÉTODOS EXISTENTES
  // ============================================

  async findAll(findWithPagination: PaginationDto) {
    const { page = 1, limit = 10 } = findWithPagination;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.userReference.findMany({
          where: { roleId: 3 },
          skip,
          take: limit,
          include: {
            studentProfile: {
              include: {
                career: true,
                studentSubjects: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.userReference.count({ where: { roleId: 3 } })
      ]);

      return {
        data,
        total,
        page,
        limit
      };

    } catch (error) {
      throw new InternalServerErrorException('Error fetching students');
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id },
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      if (!user || user.roleId !== 3) {
        throw new NotFoundException('Student not found');
      }

      return user;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching student');
    }
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 3) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      if (updateStudentDto.email) {
        const duplicateEmail = await this.prisma.userReference.findFirst({
          where: {
            email: updateStudentDto.email,
            id: { not: id }
          }
        });

        if (duplicateEmail) {
          throw new ConflictException(`User with email ${updateStudentDto.email} already exists`);
        }
      }

      const userUpdateData = {
        ...(updateStudentDto.name && { name: updateStudentDto.name }),
        ...(updateStudentDto.email && { email: updateStudentDto.email }),
        ...(updateStudentDto.status && { status: updateStudentDto.status }),
      };

      const profileUpdateData = {
        ...(updateStudentDto.careerId && { careerId: updateStudentDto.careerId }),
        ...(updateStudentDto.currentCicle && { currentCicle: updateStudentDto.currentCicle }),
      };

      const updatedUser = await this.prisma.userReference.update({
        where: { id },
        data: {
          ...userUpdateData,
          ...(Object.keys(profileUpdateData).length > 0 && {
            studentProfile: {
              update: profileUpdateData
            }
          })
        },
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating student');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 3) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      await this.prisma.userReference.delete({
        where: { id }
      });

      return { message: `Student with ID ${id} has been successfully removed` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing student');
    }
  }
}