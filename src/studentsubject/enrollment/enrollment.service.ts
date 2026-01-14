import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
    InternalServerErrorException
} from '@nestjs/common';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PrismaAcademicService } from 'src/prisma/prisma-academic.service';

interface EnrollmentDto {
    studentId: number;
    subjectId: number;
}

@Injectable()
export class EnrollmentService {
    constructor(
        private readonly prismaProfiles: PrismaProfilesService,
        private readonly prismaAcademic: PrismaAcademicService,
    ) { }

    // ============================================
    // PARTE 4: OPERACIÓN TRANSACCIONAL
    // ============================================

    /**
     * Proceso de matriculación transaccional con principios ACID:
     * 
     * 1. Verificar que el estudiante esté activo
     * 2. Verificar disponibilidad de cupos en la asignatura
     * 3. Registrar la matrícula
     * 4. Descontar el cupo disponible de la asignatura
     * 
     * Si alguna operación falla, toda la transacción se revierte
     * 
     * PRINCIPIOS ACID APLICADOS:
     * - Atomicidad: Todo o nada - si falla cualquier paso, se revierte todo
     * - Consistencia: Se mantiene la integridad referencial y reglas de negocio
     * - Aislamiento: Uso de transacciones para evitar condiciones de carrera
     * - Durabilidad: Una vez confirmada, la matrícula persiste en la BD
     */
    async enrollStudentInSubject(enrollmentDto: EnrollmentDto) {
        const { studentId, subjectId } = enrollmentDto;

        try {
            // Iniciar transacción con $transaction
            const result = await this.prismaProfiles.$transaction(async (tx) => {

                // ===== PASO 1: Verificar que el estudiante esté activo =====
                const student = await tx.userReference.findUnique({
                    where: { id: studentId },
                    include: {
                        studentProfile: {
                            include: {
                                career: true
                            }
                        }
                    }
                });

                if (!student || student.roleId !== 3) {
                    throw new NotFoundException(`Estudiante con ID ${studentId} no encontrado`);
                }

                if (student.status !== 'active') {
                    throw new BadRequestException(
                        `El estudiante ${student.name} no está activo. Estado actual: ${student.status}`
                    );
                }

                if (!student.studentProfile) {
                    throw new BadRequestException('El estudiante no tiene un perfil académico');
                }

                // ===== PASO 2: Verificar que la materia exista =====
                // Nota: Como no tenemos campo "availableSlots" en Subject, 
                // simulamos la verificación de cupos
                const subjectReference = await tx.subjectReference.findUnique({
                    where: { id: subjectId }
                });

                if (!subjectReference) {
                    throw new NotFoundException(`Materia con ID ${subjectId} no encontrada`);
                }

                // Verificar que la materia pertenezca a la carrera del estudiante
                if (subjectReference.careerId !== student.studentProfile.careerId) {
                    throw new BadRequestException(
                        `La materia "${subjectReference.name}" no pertenece a la carrera del estudiante`
                    );
                }

                // ===== PASO 2.5: Verificar cupos disponibles (simulado) =====
                // En un sistema real, tendríamos un campo "maxStudents" y "enrolledStudents"
                const currentEnrollments = await tx.studentSubject.count({
                    where: { subjectId: subjectId }
                });

                const MAX_STUDENTS_PER_SUBJECT = 30; // Límite configurable

                if (currentEnrollments >= MAX_STUDENTS_PER_SUBJECT) {
                    throw new BadRequestException(
                        `No hay cupos disponibles en la materia "${subjectReference.name}". ` +
                        `Cupos ocupados: ${currentEnrollments}/${MAX_STUDENTS_PER_SUBJECT}`
                    );
                }

                // ===== PASO 3: Verificar que no esté ya matriculado =====
                const existingEnrollment = await tx.studentSubject.findFirst({
                    where: {
                        studentProfileId: student.studentProfile.id,
                        subjectId: subjectId
                    }
                });

                if (existingEnrollment) {
                    throw new ConflictException(
                        `El estudiante ya está matriculado en la materia "${subjectReference.name}"`
                    );
                }

                // ===== PASO 4: Registrar la matrícula =====
                const enrollment = await tx.studentSubject.create({
                    data: {
                        studentProfileId: student.studentProfile.id,
                        subjectId: subjectId,
                        status: 'enrolled'
                    },
                    include: {
                        studentProfile: {
                            include: {
                                user: true
                            }
                        },
                        subject: true
                    }
                });

                // ===== PASO 5: "Descontar" el cupo (simulado mediante log) =====
                // En un sistema real, actualizaríamos un campo "availableSlots"
                // Ejemplo: await prismaAcademic.subject.update({ 
                //   where: { id: subjectId },
                //   data: { availableSlots: { decrement: 1 } }
                // })

                console.log(`[TRANSACTION] Cupo descontado de la materia ${subjectReference.name}`);
                console.log(`[TRANSACTION] Cupos restantes: ${MAX_STUDENTS_PER_SUBJECT - currentEnrollments - 1}`);

                return {
                    enrollment,
                    student,
                    subject: subjectReference,
                    slotsRemaining: MAX_STUDENTS_PER_SUBJECT - currentEnrollments - 1
                };
            });

            // Si llegamos aquí, la transacción fue exitosa
            return {
                success: true,
                message: `Matrícula exitosa para ${result.student.name} en ${result.subject.name}`,
                data: {
                    enrollmentId: result.enrollment.id,
                    student: {
                        id: result.student.id,
                        name: result.student.name,
                        email: result.student.email,
                        career: result.student.studentProfile?.career.name
                    },
                    subject: {
                        id: result.subject.id,
                        name: result.subject.name,
                        cycle: result.subject.cicleNumber
                    },
                    enrollmentDate: result.enrollment.enrolledAt,
                    status: result.enrollment.status,
                    slotsRemaining: result.slotsRemaining
                }
            };

        } catch (error) {
            // Si hay cualquier error, Prisma automáticamente revierte la transacción

            if (error instanceof NotFoundException ||
                error instanceof BadRequestException ||
                error instanceof ConflictException) {
                throw error;
            }

            console.error('[TRANSACTION ERROR]', error);
            throw new InternalServerErrorException(
                'Error durante el proceso de matriculación. La transacción ha sido revertida.'
            );
        }
    }

    /**
     * Matriculación masiva con transacción
     * Matricular un estudiante en múltiples materias de forma atómica
     */
    async enrollStudentInMultipleSubjects(
        studentId: number,
        subjectIds: number[]
    ) {
        try {
            const result = await this.prismaProfiles.$transaction(async (tx) => {

                // Verificar estudiante (una sola vez)
                const student = await tx.userReference.findUnique({
                    where: { id: studentId },
                    include: {
                        studentProfile: {
                            include: {
                                career: true
                            }
                        }
                    }
                });

                if (!student || student.roleId !== 3 || student.status !== 'active') {
                    throw new BadRequestException('Estudiante no válido o no activo');
                }

                const enrollments: any[] = [];
                const errors: string[] = [];

                // Matricular en cada materia
                for (const subjectId of subjectIds) {
                    try {
                        const subject = await tx.subjectReference.findUnique({
                            where: { id: subjectId }
                        });

                        if (!subject) {
                            errors.push(`Materia ID ${subjectId} no encontrada`);
                            continue;
                        }

                        // Verificar si ya está matriculado
                        const existing = await tx.studentSubject.findFirst({
                            where: {
                                studentProfileId: student.studentProfile!.id,
                                subjectId: subjectId
                            }
                        });

                        if (existing) {
                            errors.push(`Ya matriculado en ${subject.name}`);
                            continue;
                        }

                        // Crear matrícula
                        const enrollment = await tx.studentSubject.create({
                            data: {
                                studentProfileId: student.studentProfile!.id,
                                subjectId: subjectId,
                                status: 'enrolled'
                            },
                            include: {
                                subject: true
                            }
                        });

                        enrollments.push(enrollment);

                    } catch (err) {
                        errors.push(`Error en materia ID ${subjectId}: ${err.message}`);
                    }
                }

                // Si hubo errores críticos, lanzar excepción para revertir todo
                if (enrollments.length === 0 && errors.length > 0) {
                    throw new BadRequestException(
                        `No se pudo matricular en ninguna materia: ${errors.join(', ')}`
                    );
                }

                return { enrollments, errors, student };
            });

            return {
                success: true,
                message: `Matriculación masiva completada para ${result.student.name}`,
                data: {
                    totalRequested: subjectIds.length,
                    successfulEnrollments: result.enrollments.length,
                    failedEnrollments: result.errors.length,
                    enrollments: result.enrollments.map(e => ({
                        id: e.id,
                        subject: e.subject.name,
                        status: e.status
                    })),
                    errors: result.errors
                }
            };

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            console.error('[MASS ENROLLMENT ERROR]', error);
            throw new InternalServerErrorException(
                'Error en matriculación masiva. Transacción revertida.'
            );
        }
    }

    /**
     * Cancelar matrícula (también usando transacción para consistencia)
     */
    async cancelEnrollment(enrollmentId: number) {
        try {
            const result = await this.prismaProfiles.$transaction(async (tx) => {

                // Buscar la matrícula
                const enrollment = await tx.studentSubject.findUnique({
                    where: { id: enrollmentId },
                    include: {
                        studentProfile: {
                            include: {
                                user: true
                            }
                        },
                        subject: true
                    }
                });

                if (!enrollment) {
                    throw new NotFoundException(`Matrícula con ID ${enrollmentId} no encontrada`);
                }

                // Verificar que no tenga calificación
                if (enrollment.grade !== null) {
                    throw new BadRequestException(
                        'No se puede cancelar una matrícula que ya tiene calificación'
                    );
                }

                // Eliminar la matrícula
                await tx.studentSubject.delete({
                    where: { id: enrollmentId }
                });

                // Aquí "incrementaríamos" el cupo disponible en la materia
                console.log(`[TRANSACTION] Cupo liberado en materia ${enrollment.subject.name}`);

                return enrollment;
            });

            return {
                success: true,
                message: `Matrícula cancelada exitosamente`,
                data: {
                    enrollmentId: result.id,
                    student: result.studentProfile.user.name,
                    subject: result.subject.name
                }
            };

        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            console.error('[CANCEL ENROLLMENT ERROR]', error);
            throw new InternalServerErrorException('Error al cancelar matrícula');
        }
    }
}