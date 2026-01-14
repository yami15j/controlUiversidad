import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';

@Injectable()
export class QueriesService {
  constructor(private readonly prismaProfiles: PrismaProfilesService) { }

  // ============================================
  // PARTE 2: OPERACIONES LÓGICAS
  // ============================================

  /**
   * 1. Buscar estudiantes que:
   *    - Estén activos (AND)
   *    - Pertenezcan a una carrera específica (AND)
   *    - Tengan matrícula en un período académico seleccionado (AND)
   */
  async findStudentsWithLogicalFilters(filters: {
    careerId: number;
    cycleNumber: number;
    status?: string;
  }) {
    try {
      const students = await this.prismaProfiles.userReference.findMany({
        where: {
          AND: [
            // Condición 1: Que sea estudiante
            { roleId: 3 },
            // Condición 2: Que esté activo
            { status: filters.status || 'active' },
            // Condición 3: Que pertenezca a la carrera específica
            {
              studentProfile: {
                careerId: filters.careerId
              }
            }
          ]
        },
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                where: {
                  // Condición 4: Que tenga matrícula en el ciclo específico
                  subject: {
                    cicleNumber: filters.cycleNumber
                  }
                },
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      // Filtrar solo estudiantes que tienen al menos una matrícula en el ciclo
      const studentsWithEnrollments = students.filter(
        student => student.studentProfile && student.studentProfile.studentSubjects.length > 0
      );

      return {
        message: 'Estudiantes filtrados con operadores lógicos (AND)',
        filters: {
          careerId: filters.careerId,
          cycleNumber: filters.cycleNumber,
          status: filters.status || 'active'
        },
        data: studentsWithEnrollments,
        total: studentsWithEnrollments.length,
        summary: {
          totalActive: students.length,
          withEnrollmentsInCycle: studentsWithEnrollments.length
        }
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al filtrar estudiantes con operadores lógicos');
    }
  }

  /**
   * Buscar estudiantes usando operador OR
   * Ejemplo: Estudiantes que estén en ciclo 1 OR ciclo 2 OR ciclo 3
   */
  async findStudentsByMultipleCycles(cycles: number[], careerId?: number) {
    try {
      const students = await this.prismaProfiles.userReference.findMany({
        where: {
          roleId: 3,
          studentProfile: {
            AND: [
              // Si se proporciona careerId, filtrar por carrera
              careerId ? { careerId: careerId } : {},
              // OR: Que esté en alguno de los ciclos especificados
              {
                OR: cycles.map(cycle => ({
                  currentCicle: cycle
                }))
              }
            ]
          }
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

      return {
        message: 'Estudiantes en múltiples ciclos (OR)',
        filters: {
          cycles: cycles,
          careerId: careerId || 'all'
        },
        data: students,
        total: students.length
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al buscar estudiantes por múltiples ciclos');
    }
  }

  /**
   * Filtrar estudiantes usando NOT
   * Ejemplo: Estudiantes que NO estén en estado "suspended" o "withdrawn"
   */
  async findActiveStudentsExcludingStatuses(excludedStatuses: string[], careerId?: number) {
    try {
      const students = await this.prismaProfiles.userReference.findMany({
        where: {
          roleId: 3,
          // NOT: Que no estén en los estados excluidos
          NOT: {
            OR: excludedStatuses.map(status => ({
              status: status
            }))
          },
          // Si se proporciona careerId, filtrar por carrera
          ...(careerId && {
            studentProfile: {
              careerId: careerId
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

      return {
        message: 'Estudiantes excluyendo estados específicos (NOT)',
        filters: {
          excludedStatuses: excludedStatuses,
          careerId: careerId || 'all'
        },
        data: students,
        total: students.length
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al filtrar estudiantes con NOT');
    }
  }

  /**
   * Consulta compleja combinando AND, OR y NOT
   * Estudiantes que:
   * - Estén activos (AND)
   * - Pertenezcan a carreras de tecnología o salud (OR)
   * - NO estén en ciclo 1 (NOT)
   * - Tengan al menos una matrícula
   */
  async findStudentsWithComplexLogic(filters: {
    careerIds: number[];
    excludeCycles: number[];
    status: string;
  }) {
    try {
      const students = await this.prismaProfiles.userReference.findMany({
        where: {
          AND: [
            // Condición 1: Que sea estudiante activo
            { roleId: 3 },
            { status: filters.status },
            // Condición 2: Que pertenezca a alguna de las carreras (OR)
            {
              studentProfile: {
                AND: [
                  {
                    OR: filters.careerIds.map(careerId => ({
                      careerId: careerId
                    }))
                  },
                  // Condición 3: Que NO esté en los ciclos excluidos (NOT)
                  {
                    NOT: {
                      OR: filters.excludeCycles.map(cycle => ({
                        currentCicle: cycle
                      }))
                    }
                  }
                ]
              }
            }
          ]
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

      // Filtrar solo los que tienen al menos una matrícula
      const studentsWithEnrollments = students.filter(
        student => student.studentProfile && student.studentProfile.studentSubjects.length > 0
      );

      return {
        message: 'Estudiantes con lógica compleja (AND + OR + NOT)',
        filters: {
          status: filters.status,
          careerIds: filters.careerIds,
          excludeCycles: filters.excludeCycles
        },
        data: studentsWithEnrollments,
        total: studentsWithEnrollments.length,
        summary: {
          totalMatching: students.length,
          withEnrollments: studentsWithEnrollments.length
        }
      };

    } catch (error) {
      throw new InternalServerErrorException('Error al ejecutar consulta compleja');
    }
  }
}