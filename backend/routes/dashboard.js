const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// OBTENER DATOS DEL DASHBOARD
// ============================================
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Información del usuario con racha
        const userResult = await db.query(
            `SELECT 
                u.id, 
                u.nombre, 
                u.apellido, 
                u.carne, 
                u.carrera, 
                u.correo, 
                u.hora_estudio,
                u.puntos_totales,
                u.creado_en,
                COALESCE(r.racha_actual, 0) as streak,
                COALESCE(r.racha_maxima, 0) as max_streak,
                r.ultima_fecha as last_streak_date
             FROM usuarios u
             LEFT JOIN rachas r ON r.usuario_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userResult.rows[0];

        // Actividades completadas hoy
        const todayResult = await db.query(
            `SELECT 
                a.id, 
                a.titulo, 
                a.categoria, 
                a.puntos,
                ac.puntos_ganados,
                ac.completado_en
             FROM actividades_completadas ac
             JOIN actividades a ON a.id = ac.actividad_id
             WHERE ac.usuario_id = $1 AND ac.fecha = CURRENT_DATE
             ORDER BY ac.completado_en`,
            [userId]
        );

        // Todas las actividades disponibles
        const activitiesResult = await db.query(
            `SELECT id, titulo, categoria, puntos
             FROM actividades
             WHERE activa = true
             ORDER BY id`
        );

        // Historial de actividades (últimos 30 días)
        const historyResult = await db.query(
            `SELECT 
                ac.fecha,
                COUNT(*) as completed_count,
                SUM(ac.puntos_ganados) as points_earned
             FROM actividades_completadas ac
             WHERE ac.usuario_id = $1
             GROUP BY ac.fecha
             ORDER BY ac.fecha DESC
             LIMIT 30`,
            [userId]
        );

        // Progreso por categoría
        const categoryProgress = await db.query(
            `SELECT 
                a.categoria,
                COUNT(DISTINCT ac.id) as completed,
                COUNT(DISTINCT a.id) as total
             FROM actividades a
             LEFT JOIN actividades_completadas ac ON ac.actividad_id = a.id 
                AND ac.usuario_id = $1
             WHERE a.activa = true
             GROUP BY a.categoria`,
            [userId]
        );

        // Recompensas desbloqueadas
        const rewardsResult = await db.query(
            `SELECT 
                r.id,
                r.nombre,
                r.descripcion,
                r.icono,
                ru.desbloqueado_en
             FROM recompensas_usuario ru
             JOIN recompensas r ON r.id = ru.recompensa_id
             WHERE ru.usuario_id = $1
             ORDER BY ru.desbloqueado_en`,
            [userId]
        );

        // Días de estudio configurados
        const studyDays = await db.query(
            `SELECT dia FROM dias_estudio WHERE usuario_id = $1`,
            [userId]
        );

        res.json({
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                carne: user.carne,
                carrera: user.carrera,
                correo: user.correo,
                hora_estudio: user.hora_estudio,
                puntos_totales: user.puntos_totales || 0,
                streak: user.streak,
                max_streak: user.max_streak,
                creado_en: user.creado_en
            },
            todayActivities: todayResult.rows,
            allActivities: activitiesResult.rows,
            history: historyResult.rows,
            categoryProgress: categoryProgress.rows,
            rewards: rewardsResult.rows,
            studyDays: studyDays.rows.map(row => row.dia)
        });

    } catch (error) {
        console.error('Error obteniendo dashboard:', error);
        res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
    }
});

// ============================================
// ACTUALIZAR HORA DE ESTUDIO
// ============================================
router.put('/study-time', authenticateToken, async (req, res) => {
    const { studyTime } = req.body;
    const userId = req.user.id;

    if (!studyTime) {
        return res.status(400).json({ error: 'Hora de estudio requerida' });
    }

    try {
        await db.query(
            `UPDATE usuarios SET hora_estudio = $1 WHERE id = $2`,
            [studyTime, userId]
        );

        res.json({ success: true, message: 'Hora de estudio actualizada' });
    } catch (error) {
        console.error('Error actualizando hora de estudio:', error);
        res.status(500).json({ error: 'Error actualizando hora de estudio' });
    }
});

// ============================================
// ACTUALIZAR DÍAS DE ESTUDIO
// ============================================
router.put('/study-days', authenticateToken, async (req, res) => {
    const { days } = req.body;
    const userId = req.user.id;

    if (!days || !Array.isArray(days)) {
        return res.status(400).json({ error: 'Días de estudio requeridos' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Eliminar días existentes
        await client.query(`DELETE FROM dias_estudio WHERE usuario_id = $1`, [userId]);

        // Insertar nuevos días
        for (const day of days) {
            await client.query(
                `INSERT INTO dias_estudio (usuario_id, dia) VALUES ($1, $2)`,
                [userId, day]
            );
        }

        await client.query('COMMIT');

        res.json({ success: true, message: 'Días de estudio actualizados' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando días de estudio:', error);
        res.status(500).json({ error: 'Error actualizando días de estudio' });
    } finally {
        client.release();
    }
});

// ============================================
// OBTENER ESTADÍSTICAS DE PROGRESO
// ============================================
router.get('/stats', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Estadísticas generales
        const generalStats = await db.query(
            `SELECT 
                COUNT(DISTINCT ac.id) as total_activities_completed,
                SUM(ac.puntos_ganados) as total_points,
                COUNT(DISTINCT ac.fecha) as active_days,
                MIN(ac.fecha) as first_activity_date,
                MAX(ac.fecha) as last_activity_date
             FROM actividades_completadas ac
             WHERE ac.usuario_id = $1`,
            [userId]
        );

        // Actividades por mes
        const monthlyStats = await db.query(
            `SELECT 
                DATE_TRUNC('month', ac.fecha) as month,
                COUNT(*) as activities_count,
                SUM(ac.puntos_ganados) as points
             FROM actividades_completadas ac
             WHERE ac.usuario_id = $1
             GROUP BY DATE_TRUNC('month', ac.fecha)
             ORDER BY month DESC
             LIMIT 6`,
            [userId]
        );

        res.json({
            general: generalStats.rows[0],
            monthly: monthlyStats.rows
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

module.exports = router;