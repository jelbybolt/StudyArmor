const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function setupDatabase() {
    try {
        console.log('📦 Conectando a PostgreSQL...');
        
        // Read SQL file
        const sqlPath = path.join(__dirname, 'StudyArmor_BaseDatos.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split into statements (basic split by semicolon)
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        console.log(`📝 Ejecutando ${statements.length} sentencias SQL...`);
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            try {
                await pool.query(stmt);
                console.log(`✅ Sentencia ${i + 1} ejecutada correctamente`);
            } catch (err) {
                console.error(`❌ Error en sentencia ${i + 1}:`, err.message);
            }
        }
        
        console.log('🎉 Base de datos configurada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error configurando la base de datos:', error);
    } finally {
        await pool.end();
    }
}

setupDatabase();