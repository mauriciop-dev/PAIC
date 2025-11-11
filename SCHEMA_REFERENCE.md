# Referencia del Esquema de la Base de Datos

Este documento proporciona una descripción general de las tablas en la base de datos de Supabase para la plataforma PAIC.

| Nombre de la Tabla     | Descripción                                                                 | Filas (Est.) | Tamaño (Est.) | Realtime |
| ---------------------- | --------------------------------------------------------------------------- | ------------ | ------------- | -------- |
| **access_points**      | Define las porterías o puntos de acceso del conjunto.                       | 0            | 16 kB         |          |
| **account_status**     | Estado financiero de cada apartamento.                                      | 9            | 32 kB         |          |
| **bookings**           | Reservas de áreas comunes hechas por los residentes.                        | 0            | 16 kB         |          |
| **chatbot_interactions**| Registro de cada interacción con el chatbot para métricas de uso.           | 0            | 16 kB         |          |
| **common_areas**       | Definición de las áreas comunes disponibles para reserva.                   | 3            | 32 kB         |          |
| **conjuntos**          | Información principal de cada conjunto residencial.                         | 2            | 32 kB         |          |
| **due_dates**          | Obligaciones de pago y vencimientos de la administración.                   | 3            | 32 kB         |          |
| **expenses**           | Registro de todos los gastos del conjunto.                                  | 18           | 32 kB         |          |
| **incomes**            | Registro de todos los ingresos del conjunto.                                | 12           | 32 kB         |          |
| **internal_staff**     | Personal que trabaja directamente para el conjunto.                         | 2            | 32 kB         |          |
| **package_logs**       | Registro de paquetes y correspondencia recibida.                            | 3            | 32 kB         | ✓        |
| **providers**          | Lista de proveedores de servicios para el conjunto.                         | 6            | 48 kB         |          |
| **residents**          | Base de datos de los residentes del conjunto.                               | 9            | 32 kB         |          |
| **tasks**              | Lista de tareas para el administrador.                                      | 3            | 32 kB         |          |
| **user_profiles**      | Perfiles de usuario que extienden la información de auth.users.             | 1            | 32 kB         |          |
| **user_roles**         | Roles personalizados y sus permisos de acceso a módulos.                    | 0            | 16 kB         |          |
| **users**              | Usuarios internos (no administradores) que acceden a la plataforma.         | 0            | 24 kB         |          |
| **visitor_logs**       | Registro histórico de visitantes.                                           | 4            | 32 kB         |          |
