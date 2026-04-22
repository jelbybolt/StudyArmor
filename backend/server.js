const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));

// ============================================
// RUTAS DE LA API
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'StudyArmor API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de actividades
app.use('/api/activities', activitiesRoutes);

// Rutas del dashboard
app.use('/api/dashboard', dashboardRoutes);

// Rutas de administración
app.use('/api/admin', adminRoutes);

// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res) => {
    // Si la ruta no es de API, servir el index.html (para SPA)
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    } else {
        res.status(404).json({ error: 'Ruta no encontrada' });
    }
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════╗
    ║                                                  ║
    ║     🛡️  STUDYARMOR SERVER STARTED  🛡️            ║
    ║                                                  ║
    ║     📍 Servidor corriendo en:                    ║
    ║        http://localhost:${PORT}                   ║
    ║                                                  ║
    ║     📚 API disponible en:                        ║
    ║        http://localhost:${PORT}/api               ║
    ║                                                  ║
    ║     🎓 Universidad Mesoamericana                 ║
    ║        Sede Quetzaltenango - 2026                ║
    ║                                                  ║
    ╚══════════════════════════════════════════════════╝
    `);
});

module.exports = app;