const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'studyarmor',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    max: 20, // máximo número de clientes en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Probar la conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL correctamente');
        release();
    }
});

// Helper para ejecutar consultas
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Consulta ejecutada:', { text, duration, rows: res.rowCount });
        }
        return res;
    } catch (error) {
        console.error('❌ Error en consulta:', error);
        throw error;
    }
}

// Helper para obtener un cliente del pool (para transacciones)
async function getClient() {
    return await pool.connect();
}

module.exports = {
    query,
    getClient,
    pool
};