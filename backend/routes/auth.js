const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');
const { generateToken } = require('../middleware/auth');

// ============================================
// REGISTRO DE NUEVO ESTUDIANTE
// ============================================
router.post('/register', async (req, res) => {
    const { name, lastname, carne, career, email, password, studyTime } = req.body;

    // Validaciones
    if (!name || !lastname || !carne || !career || !email || !password) {
        return res.status(400).json({ 
            error: 'Todos los campos son requeridos' 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            error: 'La contraseña debe tener al menos 6 caracteres' 
        });
    }

    if (!email.includes('@')) {
        return res.status(400).json({ 
            error: 'Correo electrónico inválido' 
        });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Verificar si el correo ya existe
        const existingUser = await client.query(
            'SELECT id FROM usuarios WHERE correo = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'El correo electrónico ya está registrado' 
            });
        }

        // Verificar si el carné ya existe
        const existingCarne = await client.query(
            'SELECT id FROM usuarios WHERE carne = $1',
            [carne]
        );

        if (existingCarne.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'El número de carné ya está registrado' 
            });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const result = await client.query(
            `INSERT INTO usuarios (nombre, apellido, carne, correo, contrasena_hash, rol, carrera, hora_estudio)
             VALUES ($1, $2, $3, $4, $5, 'estudiante', $6, $7)
             RETURNING id, nombre, apellido, carne, correo, rol, carrera, hora_estudio, creado_en`,
            [name, lastname, carne, email, hashedPassword, career, studyTime || '18:00']
        );

        const newUser = result.rows[0];

        // Crear registro de racha
        await client.query(
            `INSERT INTO rachas (usuario_id, racha_actual, racha_maxima, ultima_fecha)
             VALUES ($1, 0, 0, NULL)`,
            [newUser.id]
        );

        // Configurar días de estudio por defecto (Lunes a Viernes)
        const defaultDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        for (const day of defaultDays) {
            await client.query(
                `INSERT INTO dias_estudio (usuario_id, dia)
                 VALUES ($1, $2)`,
                [newUser.id, day]
            );
        }

        await client.query('COMMIT');

        // Generar token
        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser.id,
                nombre: newUser.nombre,
                apellido: newUser.apellido,
                correo: newUser.correo,
                rol: newUser.rol,
                carrera: newUser.carrera
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registro:', error);
        res.status(500).json({ 
            error: 'Error en el servidor. Por favor, intenta nuevamente.' 
        });
    } finally {
        client.release();
    }
});

// ============================================
// INICIO DE SESIÓN
// ============================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            error: 'Correo y contraseña son requeridos' 
        });
    }

    try {
        // Buscar usuario por correo
        const result = await db.query(
            `SELECT id, nombre, apellido, correo, contrasena_hash, rol, carrera, hora_estudio
             FROM usuarios 
             WHERE correo = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Credenciales incorrectas' 
            });
        }

        const user = result.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.contrasena_hash);

        if (!validPassword) {
            return res.status(401).json({ 
                error: 'Credenciales incorrectas' 
            });
        }

        // Actualizar último acceso
        await db.query(
            `UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1`,
            [user.id]
        );

        // Generar token
        const token = generateToken(user);

        // Eliminar hash de la contraseña de la respuesta
        const { contrasena_hash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            error: 'Error en el servidor. Por favor, intenta nuevamente.' 
        });
    }
});

// ============================================
// VERIFICAR TOKEN (para mantener sesión)
// ============================================
router.get('/verify', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'studyarmor_secret_key_2026');
        
        const result = await db.query(
            `SELECT id, nombre, apellido, correo, rol, carrera
             FROM usuarios WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        res.json({ valid: true, user: result.rows[0] });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Token inválido' });
    }
});

module.exports = router;