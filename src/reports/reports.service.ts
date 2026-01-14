import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';

interface StudentEnrollmentReport {
  student_id: number;
  student_name: string;
  student_email: string;
  career_id: number;
  career_name: string;
  current_cycle: number;
  total_subjects: bigint;
  enrolled_status: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prismaProfiles: PrismaProfilesService) { }

  // ============================================
  // PARTE 3: CONSULTA NATIVA
  // ============================================

  /**
   * Obtener un reporte con:
   * - Nombre del estudiante
   * - Carrera
   * - Número total de materias matriculadas
   * Ordenar el resultado por número de materias (descendente)
   */
  async getStudentEnrollmentReport() {
    try {
      const report = await this.prismaProfiles.$queryRaw<StudentEnrollmentReport[]>`
        SELECT 
          ur.id AS student_id,
          ur.name AS student_name,
          ur.email AS student_email,
          cr.id AS career_id,
          cr.name AS career_name,
          sp.current_cicle AS current_cycle,
          COUNT(ss.id)::BIGINT AS total_subjects,
          ur.status AS enrolled_status
        FROM 
          user_reference ur
        INNER JOIN 
          student_profile sp ON ur.id = sp.user_id
        INNER JOIN 
          career_reference cr ON sp.career_id = cr.id
        LEFT JOIN 
          student_subject ss ON sp.id = ss.student_profile_id
        WHERE 
          ur.role_id = 3
        GROUP BY 
          ur.id, ur.name, ur.email, cr.id, cr.name, sp.current_cicle, ur.status
        ORDER BY 
          total_subjects DESC, ur.name ASC
      `;

      // Convertir BigInt a number para JSON
      const formattedReport = report.map(row => ({
        ...row,
        total_subjects: Number(row.total_subjects)
      }));

      return {
        message: 'Reporte de matrículas por estudiante',
        data: formattedReport,
        total: formattedReport.length,
        summary: {
          totalStudents: formattedReport.length,
          studentsWithEnrollments: formattedReport.filter(s => s.total_subjects > 0).length,
          studentsWithoutEnrollments: formattedReport.filter(s => s.total_subjects === 0).length,
          maxSubjectsEnrolled: formattedReport.length > 0 ? formattedReport[0].total_subjects : 0
        }
      };

    } catch (error) {
      console.error('Error en consulta nativa:', error);
      throw new InternalServerErrorException('Error al generar reporte de matrículas');
    }
  }

  /**
   * Reporte de estudiantes por carrera (consulta nativa alternativa)
   */
  async getStudentsByCareerReport() {
    try {
      const report = await this.prismaProfiles.$queryRaw<any[]>`
        SELECT 
          cr.id AS career_id,
          cr.name AS career_name,
          cr.total_cicles,
          COUNT(DISTINCT sp.id)::BIGINT AS total_students,
          COUNT(ss.id)::BIGINT AS total_enrollments,
          COALESCE(AVG(CASE WHEN ss.grade IS NOT NULL THEN ss.grade ELSE NULL END), 0) AS average_grade
        FROM 
          career_reference cr
        LEFT JOIN 
          student_profile sp ON cr.id = sp.career_id
        LEFT JOIN 
          student_subject ss ON sp.id = ss.student_profile_id
        GROUP BY 
          cr.id, cr.name, cr.total_cicles
        ORDER BY 
          total_students DESC
      `;

      const formattedReport = report.map(row => ({
        career_id: row.career_id,
        career_name: row.career_name,
        total_cicles: row.total_cicles,
        total_students: Number(row.total_students),
        total_enrollments: Number(row.total_enrollments),
        average_grade: parseFloat(Number(row.average_grade).toFixed(2))
      }));

      return {
        message: 'Reporte de estudiantes por carrera',
        data: formattedReport,
        total: formattedReport.length
      };

    } catch (error) {
      console.error('Error en consulta nativa:', error);
      throw new InternalServerErrorException('Error al generar reporte por carrera');
    }
  }

  /**
   * Reporte de profesores con su carga académica (consulta nativa)
   */
  async getTeacherWorkloadReport() {
    try {
      const report = await this.prismaProfiles.$queryRaw<any[]>`
        SELECT 
          ur.id AS teacher_id,
          ur.name AS teacher_name,
          ur.email AS teacher_email,
          sr.name AS speciality,
          cr.name AS career,
          COUNT(sa.id)::BIGINT AS total_subjects_assigned,
          COUNT(DISTINCT subr.id)::BIGINT AS unique_subjects
        FROM 
          user_reference ur
        INNER JOIN 
          teacher_profile tp ON ur.id = tp.user_id
        INNER JOIN 
          speciality_reference sr ON tp.speciality_id = sr.id
        INNER JOIN 
          career_reference cr ON tp.career_id = cr.id
        LEFT JOIN 
          subject_assignment sa ON tp.id = sa.teacher_profile_id
        LEFT JOIN 
          subject_reference subr ON sa.subject_id = subr.id
        WHERE 
          ur.role_id = 2
        GROUP BY 
          ur.id, ur.name, ur.email, sr.name, cr.name
        ORDER BY 
          total_subjects_assigned DESC, ur.name ASC
      `;

      const formattedReport = report.map(row => ({
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name,
        teacher_email: row.teacher_email,
        speciality: row.speciality,
        career: row.career,
        total_subjects_assigned: Number(row.total_subjects_assigned),
        unique_subjects: Number(row.unique_subjects)
      }));

      return {
        message: 'Reporte de carga académica de profesores',
        data: formattedReport,
        total: formattedReport.length,
        summary: {
          totalTeachers: formattedReport.length,
          teachersWithSubjects: formattedReport.filter(t => t.total_subjects_assigned > 0).length,
          teachersWithoutSubjects: formattedReport.filter(t => t.total_subjects_assigned === 0).length
        }
      };

    } catch (error) {
      console.error('Error en consulta nativa:', error);
      throw new InternalServerErrorException('Error al generar reporte de profesores');
    }
  }

  /**
   * Estadísticas generales del sistema (consulta nativa compleja)
   */
  async getSystemStatistics() {
    try {
      const stats = await this.prismaProfiles.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*)::BIGINT FROM user_reference WHERE role_id = 3) AS total_students,
          (SELECT COUNT(*)::BIGINT FROM user_reference WHERE role_id = 2) AS total_teachers,
          (SELECT COUNT(*)::BIGINT FROM career_reference) AS total_careers,
          (SELECT COUNT(*)::BIGINT FROM subject_reference) AS total_subjects,
          (SELECT COUNT(*)::BIGINT FROM student_subject) AS total_enrollments,
          (SELECT COUNT(*)::BIGINT FROM student_subject WHERE grade IS NOT NULL) AS graded_enrollments,
          (SELECT COALESCE(AVG(grade), 0) FROM student_subject WHERE grade IS NOT NULL) AS overall_average
      `;

      const formattedStats = {
        total_students: Number(stats[0].total_students),
        total_teachers: Number(stats[0].total_teachers),
        total_careers: Number(stats[0].total_careers),
        total_subjects: Number(stats[0].total_subjects),
        total_enrollments: Number(stats[0].total_enrollments),
        graded_enrollments: Number(stats[0].graded_enrollments),
        overall_average: parseFloat(Number(stats[0].overall_average).toFixed(2))
      };

      return {
        message: 'Estadísticas generales del sistema',
        data: formattedStats
      };

    } catch (error) {
      console.error('Error en consulta nativa:', error);
      throw new InternalServerErrorException('Error al generar estadísticas del sistema');
    }
  }
}