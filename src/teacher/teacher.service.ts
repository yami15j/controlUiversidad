import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaProfilesService) { }

  private readonly teacherIncludes = {
    speciality: true,
    career: true,
    subjects: {
      include: {
        subject: true
      }
    }
  }

  // ============================================
  // PARTE 1: CONSULTAS DERIVADAS
  // ============================================

  /**
   * 3. Listar los docentes que imparten más de una asignatura
   */
  async findTeachersWithMultipleSubjects(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    try {
      // Obtener todos los profesores con sus materias
      const allTeachers = await this.prisma.userReference.findMany({
        where: { roleId: 2 }, // TEACHER
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      // Filtrar profesores con más de una materia
      const teachersWithMultipleSubjects = allTeachers.filter(
        teacher => teacher.teacherProfile && teacher.teacherProfile.subjects.length > 1
      );

      // Aplicar paginación manualmente
      const total = teachersWithMultipleSubjects.length;
      const paginatedData = teachersWithMultipleSubjects.slice(skip, skip + limit);

      return {
        message: 'Docentes que imparten más de una asignatura',
        data: paginatedData.map(teacher => ({
          ...teacher,
          subjectsCount: teacher.teacherProfile?.subjects.length || 0
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al obtener docentes con múltiples asignaturas');
    }
  }

  // ============================================
  // PARTE 2: OPERACIONES LÓGICAS
  // ============================================

  /**
   * Filtrar docentes usando operadores lógicos complejos:
   * - Sean de tiempo completo (status = 'full_time')
   * - Dicten asignaturas (tienen subjects)
   * - NO estén inactivos (status != 'inactive')
   */
  async findTeachersWithLogicalOperators(filters?: {
    isFullTime?: boolean;
    hasSubjects?: boolean;
    excludeInactive?: boolean;
    specialityId?: number;
    careerId?: number;
  }) {
    try {
      // Construir condiciones WHERE dinámicamente
      const whereConditions: any = {
        roleId: 2, // TEACHER
        AND: []
      };

      // Filtro: Excluir inactivos (NOT)
      if (filters?.excludeInactive !== false) {
        whereConditions.AND.push({
          status: {
            not: 'inactive'
          }
        });
      }

      // Filtro: Tiempo completo (podríamos agregar un campo en el futuro)
      // Por ahora, usamos status: 'active' como equivalente
      if (filters?.isFullTime) {
        whereConditions.AND.push({
          status: 'active'
        });
      }

      // Obtener profesores
      const teachers = await this.prisma.userReference.findMany({
        where: whereConditions,
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: {
                include: {
                  subject: true
                }
              }
            },
            where: {
              AND: [
                // Filtro por especialidad (si se proporciona)
                filters?.specialityId ? { specialityId: filters.specialityId } : {},
                // Filtro por carrera (si se proporciona)
                filters?.careerId ? { careerId: filters.careerId } : {}
              ]
            }
          }
        }
      });

      // Filtro post-consulta: Que tengan asignaturas (OR podríamos no filtrar)
      let filteredTeachers = teachers;
      if (filters?.hasSubjects) {
        filteredTeachers = teachers.filter(
          teacher => teacher.teacherProfile && teacher.teacherProfile.subjects.length > 0
        );
      }

      return {
        message: 'Docentes filtrados con operadores lógicos',
        filters: {
          excludeInactive: filters?.excludeInactive !== false,
          isFullTime: filters?.isFullTime || false,
          hasSubjects: filters?.hasSubjects || false,
          specialityId: filters?.specialityId || null,
          careerId: filters?.careerId || null
        },
        data: filteredTeachers,
        total: filteredTeachers.length
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al filtrar docentes con operadores lógicos');
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
          where: { roleId: 2 },
          skip,
          take: limit,
          include: {
            teacherProfile: {
              include: {
                speciality: true,
                career: true,
                subjects: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.userReference.count({ where: { roleId: 2 } })
      ]);

      return {
        data,
        total,
        page,
        limit
      };

    } catch (error) {
      throw new InternalServerErrorException('Error fetching teachers');
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id },
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      if (!user || user.roleId !== 2) {
        throw new NotFoundException('Teacher not found');
      }

      return user;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching teacher');
    }
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 2) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      if (updateTeacherDto.email) {
        const duplicateEmail = await this.prisma.userReference.findFirst({
          where: {
            email: updateTeacherDto.email,
            id: { not: id }
          }
        });

        if (duplicateEmail) {
          throw new ConflictException(`User with email ${updateTeacherDto.email} already exists`);
        }
      }

      const userUpdateData = {
        ...(updateTeacherDto.name && { name: updateTeacherDto.name }),
        ...(updateTeacherDto.email && { email: updateTeacherDto.email }),
      };

      const profileUpdateData = {
        ...(updateTeacherDto.specialityId && { specialityId: updateTeacherDto.specialityId }),
        ...(updateTeacherDto.careerId && { careerId: updateTeacherDto.careerId }),
      };

      const updatedUser = await this.prisma.userReference.update({
        where: { id },
        data: {
          ...userUpdateData,
          ...(Object.keys(profileUpdateData).length > 0 && {
            teacherProfile: {
              update: profileUpdateData
            }
          })
        },
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: {
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
      throw new InternalServerErrorException('Error updating teacher');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 2) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      await this.prisma.userReference.delete({
        where: { id }
      });

      return { message: `Teacher with ID ${id} has been successfully removed` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing teacher');
    }
  }
}