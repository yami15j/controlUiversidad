Análisis de Principios ACID en el Proceso de Matriculación

Estudiante: Zaida Yamileth Jumbo Martínez
Materia: HERRAMIENTAS INFORMATICAS PARA EL DESPLIEGUE DE DIAGRAMAS
Fecha: 14 de Enero 2026

Introducción

En el sistema de gestión universitaria, el proceso de matriculación es una operación crítica, ya que involucra la inscripción formal de los estudiantes en las asignaturas. Para garantizar la integridad y confiabilidad de los datos, este proceso se implementa utilizando transacciones que cumplen con los principios ACID: Atomicidad, Consistencia, Aislamiento y Durabilidad.

1. Atomicidad

La atomicidad garantiza que una transacción se ejecute completamente o no se ejecute en absoluto, siguiendo el principio de “todo o nada”.
En el proceso de matriculación, la transacción incluye la verificación del estado del estudiante, la validación de la asignatura, la comprobación de cupos disponibles y el registro de la matrícula. Si alguno de estos pasos falla, la transacción se revierte automáticamente, evitando que el sistema quede en un estado inconsistente, como un estudiante matriculado sin cupo disponible o viceversa.

2. Consistencia

La consistencia asegura que la base de datos pase de un estado válido a otro estado válido, respetando todas las reglas de negocio y restricciones de integridad.
En el sistema, se valida que el estudiante esté activo, que la materia pertenezca a la carrera correspondiente y que no exista una matrícula duplicada. Además, las relaciones definidas en la base de datos garantizan la integridad referencial entre estudiantes, materias y matrículas. De esta forma, cada transacción mantiene la coherencia de los datos antes y después de su ejecución.

3. Aislamiento

El aislamiento controla la forma en que las transacciones concurrentes interactúan entre sí. Cuando varios estudiantes intentan matricularse simultáneamente en una misma asignatura, el uso de transacciones evita condiciones de carrera.
Gracias al manejo transaccional del motor de base de datos, cada operación de matriculación se procesa de manera independiente, asegurando que los cupos se actualicen correctamente y evitando el sobrecupo en las asignaturas.

4. Durabilidad

La durabilidad garantiza que, una vez confirmada una transacción, los cambios persisten de forma permanente, incluso ante fallos del sistema.
En el contexto universitario, esto es fundamental, ya que las matrículas representan registros académicos oficiales. Una vez que la transacción de matriculación se confirma, la información queda almacenada de manera segura en la base de datos y no se pierde aunque el servidor se reinicie o ocurra una falla inesperada.

Conclusión

La aplicación de los principios ACID en el proceso de matriculación permite garantizar un sistema confiable, consistente y seguro. El uso de transacciones asegura que las operaciones críticas se realicen correctamente, protegiendo la integridad de los datos académicos y proporcionando una base sólida para la gestión universitaria.

Adicional

## Datos de prueba
El proyecto incluye un script de seeding que genera datos completos (roles, carreras, docentes, estudiantes, materias y matrículas) para facilitar las pruebas de consultas, transacciones y principios ACID.

Los datos de prueba fueron generados mediante un script de seeding ubicado en la carpeta prisma/seeds. Este se ejecuta después de aplicar las migraciones, garantizando consistencia y permitiendo validar de manera confiable las consultas derivadas, las transacciones y la aplicación de los principios ACID.

Ejemplo de los datos generados: 
Con el siguiente codigo : npm run seed:complete


🌱 Iniciando seed de datos de prueba...

📋 Creando roles...
✅ Roles creados

🎓 Creando datos académicos...
✅ Datos académicos creados

🔄 Sincronizando referencias...
✅ Referencias sincronizadas

👨‍🏫 Creando profesores...
  ✅ Profesor creado: Dr. Carlos Méndez
  ✅ Profesor creado: Ing. María López
✅ Profesores creados

📚 Asignando materias a profesores...
  ✅ Dr. Carlos asignado a 3 materias
  ✅ Ing. María asignada a 2 materias
✅ Materias asignadas

👨‍🎓 Creando estudiantes...
  ✅ Estudiante creado: Juan Pérez (active)
  ✅ Estudiante creado: María García (active)
  ✅ Estudiante creado: Pedro Sánchez (active)
  ✅ Estudiante creado: Ana Rodríguez (suspended)
✅ Estudiantes creados

📝 Creando matrículas...
  ✅ Juan Pérez matriculado en 3 materias
  ✅ María García matriculada en 2 materias
  ✅ Pedro Sánchez matriculado en 2 materias
✅ Matrículas creadas

📊 RESUMEN DE DATOS CREADOS:
================================
Roles:          3
Especialidades: 3
Carreras:       2
Ciclos:         1 (activo)
Materias:       7
Profesores:     2 (con 3 y 2 materias)
Estudiantes:    4 (3 activos, 1 suspendido)
Matrículas:     7

🎉 ¡Seed completado exitosamente!

📝 CREDENCIALES DE PRUEBA:
================================
PROFESORES:
  Email: carlos.mendez@sudamericano.edu.ec
  Pass:  teacher123

  Email: maria.lopez@sudamericano.edu.ec
  Pass:  teacher123

ESTUDIANTES:
  Email: juan.perez@sudamericano.edu.ec
  Pass:  student123

  Email: maria.garcia@sudamericano.edu.ec
  Pass:  student123
