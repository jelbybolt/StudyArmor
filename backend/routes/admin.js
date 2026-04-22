const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// ============================================
// OBTENER TODOS LOS ESTUDIANTES
// ============================================
router.get('/students', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                u.id,
                u.nombre,
                u.apellido,
                u.carne,
                u.carrera,
                u.correo,
                u.creado_en as registered_at,
                u.ultimo_acceso as last_access,
                COALESCE(u.puntos_totales, 0) as total_points,
                COALESCE(r.racha_actual, 0) as streak,
                COALESCE(r.racha_maxima, 0) as max_streak,
                COUNT(DISTINCT ac.id) as total_activities,
                COUNT(DISTINCT CASE WHEN ac.fecha = CURRENT_DATE THEN ac.id END) as today_activities,
                COUNT(DISTINCT ru.id) as rewards_unlocked
            FROM usuarios u
            LEFT JOIN rachas r ON r.usuario_id = u.id
            LEFT JOIN actividades_completadas ac ON ac.usuario_id = u.id
            LEFT JOIN recompensas_usuario ru ON ru.usuario_id = u.id
            WHERE u.rol = 'estudiante'
            GROUP BY u.id, u.nombre, u.apellido, u.carne, u.carrera, u.correo, 
                     u.creado_en, u.ultimo_acceso, u.puntos_totales, 
                     r.racha_actual, r.racha_maxima
            ORDER BY u.creado_en DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estudiantes:', error);
        res.status(500).json({ error: 'Error obteniendo datos de estudiantes' });
    }
});

// ============================================
// OBTENER ESTADÍSTICAS DIARIAS
// ============================================
router.get('/daily-stats', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                ac.fecha,
                COUNT(DISTINCT ac.usuario_id) as active_students,
                COUNT(*) as total_completed,
                SUM(ac.puntos_ganados) as xp_generated,
                AVG(ac.intentos) as avg_attempts
            FROM actividades_completadas ac
            WHERE ac.fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY ac.fecha
            ORDER BY ac.fecha DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estadísticas diarias:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas diarias' });
    }
});

// ============================================
// OBTENER ESTADÍSTICAS GENERALES
// ============================================
router.get('/stats', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Estadísticas generales
        const generalStats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM usuarios WHERE rol = 'estudiante') as total_students,
                (SELECT COUNT(*) FROM actividades_completadas) as total_completions,
                (SELECT SUM(puntos_ganados) FROM actividades_completadas) as total_xp,
                (SELECT AVG(racha_actual) FROM rachas) as avg_streak,
                (SELECT COUNT(DISTINCT usuario_id) FROM actividades_completadas WHERE fecha = CURRENT_DATE) as active_today
        `);

        // Top estudiantes por puntos
        const topStudents = await db.query(`
            SELECT 
                u.nombre,
                u.apellido,
                u.carne,
                COALESCE(u.puntos_totales, 0) as points,
                COALESCE(r.racha_actual, 0) as streak
            FROM usuarios u
            LEFT JOIN rachas r ON r.usuario_id = u.id
            WHERE u.rol = 'estudiante'
            ORDER BY u.puntos_totales DESC NULLS LAST
            LIMIT 10
        `);

        // Actividades más completadas
        const topActivities = await db.query(`
            SELECT 
                a.titulo,
                a.categoria,
                COUNT(ac.id) as completion_count,
                AVG(ac.intentos) as avg_attempts
            FROM actividades a
            JOIN actividades_completadas ac ON ac.actividad_id = a.id
            GROUP BY a.id, a.titulo, a.categoria
            ORDER BY completion_count DESC
            LIMIT 5
        `);

        res.json({
            general: generalStats.rows[0],
            topStudents: topStudents.rows,
            topActivities: topActivities.rows
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// ============================================
// OBTENER DETALLE DE UN ESTUDIANTE ESPECÍFICO
// ============================================
router.get('/students/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const studentId = parseInt(req.params.id);

    try {
        // Información del estudiante
        const studentInfo = await db.query(`
            SELECT 
                u.id,
                u.nombre,
                u.apellido,
                u.carne,
                u.carrera,
                u.correo,
                u.hora_estudio,
                u.creado_en,
                u.ultimo_acceso,
                COALESCE(u.puntos_totales, 0) as total_points,
                COALESCE(r.racha_actual, 0) as streak,
                COALESCE(r.racha_maxima, 0) as max_streak,
                r.ultima_fecha as last_streak_date
            FROM usuarios u
            LEFT JOIN rachas r ON r.usuario_id = u.id
            WHERE u.id = $1 AND u.rol = 'estudiante'
        `, [studentId]);

        if (studentInfo.rows.length === 0) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        // Historial de actividades
        const activityHistory = await db.query(`
            SELECT 
                ac.fecha,
                a.titulo,
                a.categoria,
                ac.puntos_ganados,
                ac.intentos,
                ac.completado_en
            FROM actividades_completadas ac
            JOIN actividades a ON a.id = ac.actividad_id
            WHERE ac.usuario_id = $1
            ORDER BY ac.fecha DESC, ac.completado_en DESC
            LIMIT 50
        `, [studentId]);

        // Recompensas desbloqueadas
        const rewards = await db.query(`
            SELECT 
                r.nombre,
                r.descripcion,
                r.icono,
                ru.desbloqueado_en
            FROM recompensas_usuario ru
            JOIN recompensas r ON r.id = ru.recompensa_id
            WHERE ru.usuario_id = $1
            ORDER BY ru.desbloqueado_en DESC
        `, [studentId]);

        res.json({
            student: studentInfo.rows[0],
            activityHistory: activityHistory.rows,
            rewards: rewards.rows
        });
    } catch (error) {
        console.error('Error obteniendo detalle del estudiante:', error);
        res.status(500).json({ error: 'Error obteniendo detalle del estudiante' });
    }
});

// ============================================
// REINICIAR PROGRESO DE ESTUDIANTE (admin)
// ============================================
router.delete('/students/:id/reset', authenticateToken, authorizeAdmin, async (req, res) => {
    const studentId = parseInt(req.params.id);

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Eliminar actividades completadas
        await client.query(`DELETE FROM actividades_completadas WHERE usuario_id = $1`, [studentId]);

        // Reiniciar racha
        await client.query(
            `UPDATE rachas SET racha_actual = 0, racha_maxima = 0, ultima_fecha = NULL WHERE usuario_id = $1`,
            [studentId]
        );

        // Eliminar recompensas
        await client.query(`DELETE FROM recompensas_usuario WHERE usuario_id = $1`, [studentId]);

        // Reiniciar puntos totales
        await client.query(`UPDATE usuarios SET puntos_totales = 0 WHERE id = $1`, [studentId]);

        await client.query('COMMIT');

        res.json({ success: true, message: 'Progreso del estudiante reiniciado' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error reiniciando progreso:', error);
        res.status(500).json({ error: 'Error reiniciando progreso' });
    } finally {
        client.release();
    }
});

module.exports = router;