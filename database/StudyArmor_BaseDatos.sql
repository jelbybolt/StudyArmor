-- ============================================================
--  STUDYARMOR — ESQUEMA DE BASE DE DATOS
--  Motor recomendado: PostgreSQL 15+
--  Proyecto: UMES Quetzaltenango | Ingeniería en Sistemas 2026
-- ============================================================

-- ------------------------------------------------------------
-- TABLA 1: usuarios
--   Almacena tanto estudiantes como administradores.
--   El campo "rol" diferencia quién es quién.
-- ------------------------------------------------------------
CREATE TABLE usuarios (
    id              SERIAL          PRIMARY KEY,
    nombre          VARCHAR(80)     NOT NULL,
    apellido        VARCHAR(80)     NOT NULL,
    carne           VARCHAR(20)     UNIQUE,              -- Solo para estudiantes
    correo          VARCHAR(120)    NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255)    NOT NULL,            -- Guardar con bcrypt
    rol             VARCHAR(20)     NOT NULL DEFAULT 'estudiante'
                    CHECK (rol IN ('estudiante','administrador')),
    carrera         VARCHAR(120),
    hora_estudio    TIME            DEFAULT '18:00',
    bloqueador_activo BOOLEAN       DEFAULT FALSE,
    creado_en       TIMESTAMPTZ     DEFAULT NOW(),
    ultimo_acceso   TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- TABLA 2: actividades
--   Catálogo de todas las actividades disponibles en la plataforma.
-- ------------------------------------------------------------
CREATE TABLE actividades (
    id              SERIAL          PRIMARY KEY,
    titulo          VARCHAR(150)    NOT NULL,
    categoria       VARCHAR(80)     NOT NULL,
    lectura         TEXT            NOT NULL,
    puntos          INT             NOT NULL DEFAULT 50,
    activa          BOOLEAN         DEFAULT TRUE,
    creado_en       TIMESTAMPTZ     DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA 3: preguntas
--   Preguntas de quiz ligadas a cada actividad.
-- ------------------------------------------------------------
CREATE TABLE preguntas (
    id              SERIAL          PRIMARY KEY,
    actividad_id    INT             NOT NULL
                    REFERENCES actividades(id) ON DELETE CASCADE,
    enunciado       TEXT            NOT NULL,
    opcion_a        VARCHAR(255)    NOT NULL,
    opcion_b        VARCHAR(255)    NOT NULL,
    opcion_c        VARCHAR(255)    NOT NULL,
    opcion_d        VARCHAR(255)    NOT NULL,
    respuesta_correcta CHAR(1)     NOT NULL
                    CHECK (respuesta_correcta IN ('A','B','C','D')),
    orden           INT             DEFAULT 1
);

-- ------------------------------------------------------------
-- TABLA 4: actividades_completadas
--   Registro de cada vez que un estudiante completa una actividad.
--   Esto permite rastrear historial, rachas y XP por día.
-- ------------------------------------------------------------
CREATE TABLE actividades_completadas (
    id              SERIAL          PRIMARY KEY,
    usuario_id      INT             NOT NULL
                    REFERENCES usuarios(id) ON DELETE CASCADE,
    actividad_id    INT             NOT NULL
                    REFERENCES actividades(id) ON DELETE CASCADE,
    fecha           DATE            NOT NULL DEFAULT CURRENT_DATE,
    puntos_ganados  INT             NOT NULL,
    intentos        INT             DEFAULT 1,          -- Cuántas veces intentó el quiz
    completado_en   TIMESTAMPTZ     DEFAULT NOW(),

    -- Un estudiante solo puede completar la misma actividad UNA vez por día
    UNIQUE (usuario_id, actividad_id, fecha)
);

-- ------------------------------------------------------------
-- TABLA 5: rachas
--   Lleva el control de la racha actual y la máxima de cada usuario.
-- ------------------------------------------------------------
CREATE TABLE rachas (
    id              SERIAL          PRIMARY KEY,
    usuario_id      INT             NOT NULL UNIQUE
                    REFERENCES usuarios(id) ON DELETE CASCADE,
    racha_actual    INT             DEFAULT 0,
    racha_maxima    INT             DEFAULT 0,
    ultima_fecha    DATE,                               -- Último día con actividades completas
    actualizado_en  TIMESTAMPTZ     DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA 6: recompensas
--   Catálogo de insignias/logros desbloqueable.
-- ------------------------------------------------------------
CREATE TABLE recompensas (
    id              SERIAL          PRIMARY KEY,
    nombre          VARCHAR(100)    NOT NULL,
    descripcion     VARCHAR(255),
    icono           VARCHAR(10),                        -- Emoji o nombre de ícono
    condicion_tipo  VARCHAR(50)     NOT NULL,           -- 'actividades','racha','puntos'
    condicion_valor INT             NOT NULL,           -- Número a alcanzar
    creado_en       TIMESTAMPTZ     DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA 7: recompensas_usuario
--   Relación de qué recompensas ha desbloqueado cada estudiante.
-- ------------------------------------------------------------
CREATE TABLE recompensas_usuario (
    id              SERIAL          PRIMARY KEY,
    usuario_id      INT             NOT NULL
                    REFERENCES usuarios(id) ON DELETE CASCADE,
    recompensa_id   INT             NOT NULL
                    REFERENCES recompensas(id) ON DELETE CASCADE,
    desbloqueado_en TIMESTAMPTZ     DEFAULT NOW(),

    UNIQUE (usuario_id, recompensa_id)
);

-- ------------------------------------------------------------
-- TABLA 8: dias_estudio
--   Días de la semana habilitados para el bloqueador de cada usuario.
-- ------------------------------------------------------------
CREATE TABLE dias_estudio (
    id              SERIAL          PRIMARY KEY,
    usuario_id      INT             NOT NULL
                    REFERENCES usuarios(id) ON DELETE CASCADE,
    dia             VARCHAR(15)     NOT NULL
                    CHECK (dia IN ('Lunes','Martes','Miércoles','Jueves',
                                   'Viernes','Sábado','Domingo')),
    UNIQUE (usuario_id, dia)
);

-- ------------------------------------------------------------
-- TABLA 9: sesiones
--   Log de cada inicio y cierre de sesión (seguridad y auditoría).
-- ------------------------------------------------------------
CREATE TABLE sesiones (
    id              SERIAL          PRIMARY KEY,
    usuario_id      INT             NOT NULL
                    REFERENCES usuarios(id) ON DELETE CASCADE,
    token           VARCHAR(255)    UNIQUE,             -- JWT o token de sesión
    ip              VARCHAR(45),
    dispositivo     TEXT,
    iniciada_en     TIMESTAMPTZ     DEFAULT NOW(),
    expirada_en     TIMESTAMPTZ,
    activa          BOOLEAN         DEFAULT TRUE
);

-- ============================================================
-- ÍNDICES — mejoran la velocidad de las consultas frecuentes
-- ============================================================
CREATE INDEX idx_act_completadas_usuario ON actividades_completadas(usuario_id);
CREATE INDEX idx_act_completadas_fecha   ON actividades_completadas(fecha);
CREATE INDEX idx_rachas_usuario          ON rachas(usuario_id);
CREATE INDEX idx_sesiones_usuario        ON sesiones(usuario_id);
CREATE INDEX idx_usuarios_rol            ON usuarios(rol);

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

-- Administrador por defecto
INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, rol)
VALUES ('Admin', 'StudyArmor', 'admin@studyarmor.edu.gt',
        '$2b$12$HASH_GENERADO_CON_BCRYPT', 'administrador');

-- Actividades del catálogo
INSERT INTO actividades (titulo, categoria, lectura, puntos) VALUES
('Técnica Pomodoro', 'Organización',
 'La técnica Pomodoro consiste en trabajar en bloques de 25 minutos de concentración total, seguidos de un descanso de 5 minutos. Después de 4 bloques, tomas un descanso largo de 15-30 minutos. Mejora la concentración y reduce la procrastinación.',
 50),
('Mapas Conceptuales', 'Técnicas de Estudio',
 'Los mapas conceptuales son representaciones gráficas jerárquicas basadas en la teoría del aprendizaje significativo de David Ausubel. Consisten en nodos conectados por palabras de enlace que describen la relación entre conceptos.',
 60),
('Gestión del Tiempo Académico', 'Planificación',
 'La gestión efectiva del tiempo requiere: priorización, planificación anticipada y seguimiento. La Matriz de Eisenhower clasifica tareas en 4 cuadrantes. Se recomiendan 2 horas de estudio independiente por cada hora de clase.',
 55),
('Repetición Espaciada', 'Memorización',
 'La repetición espaciada combate la curva del olvido de Ebbinghaus: repasamos a las 24h, 3 días, 1 semana y 1 mes. Sin repaso olvidamos el 70% en las primeras 24 horas. Las tarjetas de estudio son la herramienta ideal.',
 65),
('Entorno de Estudio', 'Disciplina',
 'Un espacio efectivo de estudio es ordenado, bien iluminado, a 18-22°C y libre de distracciones. Estudiar siempre en el mismo lugar crea la asociación mental lugar = estudio que facilita la concentración.',
 45);

-- Preguntas para Actividad 1 (Pomodoro)
INSERT INTO preguntas (actividad_id, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden) VALUES
(1, '¿Cuántos minutos dura un bloque de trabajo Pomodoro?', '15 minutos', '25 minutos', '45 minutos', '60 minutos', 'B', 1),
(1, '¿Qué ocurre después de 4 bloques consecutivos?', 'Se termina', 'Descanso largo 15-30 min', 'Se duplica el tiempo', 'Nada', 'B', 2),
(1, '¿Cuál es el principal beneficio de la técnica?', 'Estudiar más horas', 'Mejorar concentración y reducir procrastinación', 'Memorizar más rápido', 'Leer más rápido', 'B', 3);

-- Preguntas para Actividad 2 (Mapas)
INSERT INTO preguntas (actividad_id, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden) VALUES
(2, '¿En qué teoría se basan los mapas conceptuales?', 'Memorización mecánica', 'Aprendizaje significativo de Ausubel', 'Inteligencias múltiples', 'Conductismo', 'B', 1),
(2, '¿Qué conectan las líneas en un mapa conceptual?', 'Solo ideas principales', 'Conceptos con palabras de enlace', 'Imágenes y textos', 'Párrafos completos', 'B', 2),
(2, '¿Para qué materias son útiles?', 'Solo humanidades', 'Materias con conceptos acumulativos', 'Solo idiomas', 'Solo historia', 'B', 3);

-- Recompensas
INSERT INTO recompensas (nombre, descripcion, icono, condicion_tipo, condicion_valor) VALUES
('Primera Actividad', 'Completa tu primera actividad',            '⭐', 'actividades', 1),
('Racha de 3 días',   'Mantén 3 días consecutivos de estudio',   '🔥', 'racha',       3),
('5 Actividades',     'Completa 5 actividades en total',          '💪', 'actividades', 5),
('Racha de 7 días',   'Una semana completa de disciplina',        '🏆', 'racha',       7),
('200 Puntos XP',     'Acumula 200 puntos de experiencia',        '💎', 'puntos',      200),
('Día Perfecto',      'Completa las 5 actividades del día',       '🎓', 'dia_perfecto',5);

-- ============================================================
-- VISTAS ÚTILES PARA EL PANEL ADMINISTRATIVO
-- ============================================================

-- Vista resumen de cada estudiante (la más útil para el admin)
CREATE VIEW vista_admin_estudiantes AS
SELECT
    u.id,
    u.nombre || ' ' || u.apellido     AS nombre_completo,
    u.carne,
    u.carrera,
    u.correo,
    u.creado_en::DATE                 AS fecha_registro,
    COALESCE(r.racha_actual, 0)       AS racha_actual,
    COALESCE(r.racha_maxima, 0)       AS racha_maxima,
    COALESCE(SUM(ac.puntos_ganados), 0) AS puntos_totales,
    COUNT(DISTINCT ac.id)             AS total_actividades,
    COUNT(DISTINCT CASE WHEN ac.fecha = CURRENT_DATE THEN ac.id END) AS actividades_hoy,
    u.ultimo_acceso
FROM usuarios u
LEFT JOIN rachas r             ON r.usuario_id = u.id
LEFT JOIN actividades_completadas ac ON ac.usuario_id = u.id
WHERE u.rol = 'estudiante'
GROUP BY u.id, u.nombre, u.apellido, u.carne, u.carrera,
         u.correo, u.creado_en, r.racha_actual, r.racha_maxima, u.ultimo_acceso
ORDER BY puntos_totales DESC;

-- Vista de actividad diaria general
CREATE VIEW vista_actividad_diaria AS
SELECT
    fecha,
    COUNT(DISTINCT usuario_id)  AS estudiantes_activos,
    COUNT(*)                    AS total_completadas,
    SUM(puntos_ganados)         AS xp_generado
FROM actividades_completadas
GROUP BY fecha
ORDER BY fecha DESC;

-- ============================================================
-- FUNCIÓN: actualizar racha automáticamente
--   Se ejecuta después de insertar en actividades_completadas
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_racha()
RETURNS TRIGGER AS $$
DECLARE
    actividades_hoy INT;
    total_actividades INT;
    ult_fecha DATE;
BEGIN
    -- ¿Cuántas actividades completó hoy este usuario?
    SELECT COUNT(*) INTO actividades_hoy
    FROM actividades_completadas
    WHERE usuario_id = NEW.usuario_id AND fecha = CURRENT_DATE;

    SELECT COUNT(*) INTO total_actividades FROM actividades WHERE activa = TRUE;

    -- Solo actualizar racha si completó TODAS las actividades del día
    IF actividades_hoy >= total_actividades THEN
        -- Obtener o crear registro de racha
        INSERT INTO rachas (usuario_id, racha_actual, racha_maxima, ultima_fecha)
        VALUES (NEW.usuario_id, 1, 1, CURRENT_DATE)
        ON CONFLICT (usuario_id) DO NOTHING;

        SELECT ultima_fecha INTO ult_fecha FROM rachas WHERE usuario_id = NEW.usuario_id;

        UPDATE rachas SET
            racha_actual = CASE
                WHEN ult_fecha = CURRENT_DATE - INTERVAL '1 day' THEN racha_actual + 1
                WHEN ult_fecha = CURRENT_DATE THEN racha_actual   -- Ya contado hoy
                ELSE 1                                            -- Se rompió la racha
            END,
            racha_maxima = GREATEST(racha_maxima,
                CASE
                    WHEN ult_fecha = CURRENT_DATE - INTERVAL '1 day' THEN racha_actual + 1
                    ELSE 1
                END),
            ultima_fecha = CURRENT_DATE,
            actualizado_en = NOW()
        WHERE usuario_id = NEW.usuario_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Disparador que llama a la función anterior
CREATE TRIGGER trg_actualizar_racha
AFTER INSERT ON actividades_completadas
FOR EACH ROW EXECUTE FUNCTION actualizar_racha();

-- ============================================================
-- CONSULTAS DE EJEMPLO PARA EL BACKEND (Node.js / PHP)
-- ============================================================

-- 1. Registrar un nuevo estudiante
/*
INSERT INTO usuarios (nombre, apellido, carne, correo, contrasena_hash, rol, carrera, hora_estudio)
VALUES ($1, $2, $3, $4, $5, 'estudiante', $6, $7)
RETURNING id, nombre, correo, rol;
*/

-- 2. Login: buscar usuario por correo
/*
SELECT id, nombre, apellido, correo, contrasena_hash, rol, carrera
FROM usuarios WHERE correo = $1;
*/

-- 3. Marcar actividad como completada
/*
INSERT INTO actividades_completadas (usuario_id, actividad_id, puntos_ganados, intentos)
VALUES ($1, $2, $3, $4)
ON CONFLICT (usuario_id, actividad_id, fecha) DO NOTHING
RETURNING id;
*/

-- 4. Panel admin: ver todos los estudiantes con su progreso
/*
SELECT * FROM vista_admin_estudiantes;
*/

-- 5. Actividades completadas hoy por un usuario
/*
SELECT a.titulo, ac.puntos_ganados, ac.intentos, ac.completado_en
FROM actividades_completadas ac
JOIN actividades a ON a.id = ac.actividad_id
WHERE ac.usuario_id = $1 AND ac.fecha = CURRENT_DATE;
*/

-- 6. Racha e info del usuario
/*
SELECT u.nombre, u.apellido, r.racha_actual, r.racha_maxima,
       COALESCE(SUM(ac.puntos_ganados), 0) AS puntos_totales
FROM usuarios u
LEFT JOIN rachas r ON r.usuario_id = u.id
LEFT JOIN actividades_completadas ac ON ac.usuario_id = u.id
WHERE u.id = $1
GROUP BY u.nombre, u.apellido, r.racha_actual, r.racha_maxima;
*/
