const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'studyarmor_secret_key_2026';

// Middleware para autenticar token JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'Acceso denegado. Token no proporcionado.' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expirado. Por favor, inicia sesión nuevamente.' 
                });
            }
            return res.status(403).json({ 
                error: 'Token inválido.' 
            });
        }
        req.user = user;
        next();
    });
}

// Middleware para autorizar solo a administradores
function authorizeAdmin(req, res, next) {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({ 
            error: 'Acceso denegado. Se requieren permisos de administrador.' 
        });
    }
    next();
}

// Middleware para verificar que el usuario accede a sus propios datos
function authorizeSelf(req, res, next) {
    const userId = parseInt(req.params.id);
    if (req.user.rol !== 'administrador' && req.user.id !== userId) {
        return res.status(403).json({ 
            error: 'Acceso denegado. No puedes acceder a datos de otro usuario.' 
        });
    }
    next();
}

// Generar token JWT
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.correo, 
            rol: user.rol,
            nombre: user.nombre
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = {
    authenticateToken,
    authorizeAdmin,
    authorizeSelf,
    generateToken
};