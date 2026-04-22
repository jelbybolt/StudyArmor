const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// OBTENER TODAS LAS ACTIVIDADES
// ============================================
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                a.id, 
                a.titulo, 
                a.categoria, 
                a.lectura, 
                a.puntos,
                a.activa,
                json_agg(
                    json_build_object(
                        'id', p.id,
                        'question', p.enunciado,
                        'options', json_build_array(p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d),
                        'answer', p.respuesta_correcta,
                        'order', p.orden
                    ) ORDER BY p.orden
                ) as questions
             FROM actividades a
             LEFT JOIN preguntas p ON p.actividad_id = a.id
             WHERE a.activa = true
             GROUP BY a.id
             ORDER BY a.id`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo actividades:', error);
        res.status(500).json({ error: 'Error obteniendo actividades' });
    }
});

// ============================================
// OBTENER ACTIVIDAD POR ID
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
    const activityId = parseInt(req.params.id);

    try {
        const result = await db.query(
            `SELECT 
                a.id, 
                a.titulo, 
                a.categoria, 
                a.lectura, 
                a.puntos,
                json_agg(
                    json_build_object(
                        'id', p.id,
                        'question', p.enunciado,
                        'options', json_build_array(p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d),
                        'answer', p.respuesta_correcta,
                        'order', p.orden
                    ) ORDER BY p.orden
                ) as questions
             FROM actividades a
             LEFT JOIN preguntas p ON p.actividad_id = a.id
             WHERE a.id = $1 AND a.activa = true
             GROUP BY a.id`,
            [activityId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actividad no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo actividad:', error);
        res.status(500).json({ error: 'Error obteniendo actividad' });
    }
});

// ============================================
// COMPLETAR ACTIVIDAD
// ============================================
router.post('/complete', authenticateToken, async (req, res) => {
    const { activityId, points, attempts } = req.body;
    const userId = req.user.id;

    if (!activityId || !points) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Verificar si ya completó la actividad hoy
        const existing = await client.query(
            `SELECT id FROM actividades_completadas
             WHERE usuario_id = $1 AND actividad_id = $2 AND fecha = CURRENT_DATE`,
            [userId, activityId]
        );

        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Ya has completado esta actividad hoy' 
            });
        }

        // Insertar actividad completada
        await client.query(
            `INSERT INTO actividades_completadas (usuario_id, actividad_id, puntos_ganados, intentos)
             VALUES ($1, $2, $3, $4)`,
            [userId, activityId, points, attempts || 1]
        );

        // Actualizar puntos totales del usuario
        await client.query(
            `UPDATE usuarios 
             SET puntos_totales = COALESCE(puntos_totales, 0) + $1
             WHERE id = $2`,
            [points, userId]
        );

        // Obtener total de actividades del día
        const todayActivities = await client.query(
            `SELECT COUNT(*) as count
             FROM actividades_completadas
             WHERE usuario_id = $1 AND fecha = CURRENT_DATE`,
            [userId]
        );

        const totalActivities = await client.query(
            `SELECT COUNT(*) as count FROM actividades WHERE activa = true`
        );

        // Si completó todas las actividades del día, actualizar racha
        if (todayActivities.rows[0].count >= totalActivities.rows[0].count) {
            const streakResult = await client.query(
                `SELECT ultima_fecha FROM rachas WHERE usuario_id = $1`,
                [userId]
            );

            const lastDate = streakResult.rows[0]?.ultima_fecha;
            const today = new Date().toISOString().slice(0, 10);
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

            let newStreak = 1;
            if (lastDate === yesterday) {
                newStreak = (await client.query(
                    `SELECT racha_actual FROM rachas WHERE usuario_id = $1`,
                    [userId]
                )).rows[0].racha_actual + 1;
            }

            await client.query(
                `UPDATE rachas 
                 SET racha_actual = $1,
                     racha_maxima = GREATEST(racha_maxima, $1),
                     ultima_fecha = CURRENT_DATE,
                     actualizado_en = NOW()
                 WHERE usuario_id = $2`,
                [newStreak, userId]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Actividad completada exitosamente',
            pointsEarned: points
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error completando actividad:', error);
        res.status(500).json({ error: 'Error completando actividad' });
    } finally {
        client.release();
    }
});

// ============================================
// OBTENER ACTIVIDADES COMPLETADAS HOY
// ============================================
router.get('/today/completed', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(
            `SELECT 
                a.id,
                a.titulo,
                ac.puntos_ganados,
                ac.intentos,
                ac.completado_en
             FROM actividades_completadas ac
             JOIN actividades a ON a.id = ac.actividad_id
             WHERE ac.usuario_id = $1 AND ac.fecha = CURRENT_DATE
             ORDER BY ac.completado_en`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo actividades completadas:', error);
        res.status(500).json({ error: 'Error obteniendo actividades completadas' });
    }
});

module.exports = router;