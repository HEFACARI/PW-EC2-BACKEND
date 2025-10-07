// path: ./config/database.js

module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      // Render provee DATABASE_URL automáticamente en el entorno
      connectionString: env('DATABASE_URL'),

      // Render exige SSL, así que lo habilitamos
      ssl: env.bool('DATABASE_SSL', true)
        ? { rejectUnauthorized: false }
        : false,
    },
    acquireConnectionTimeout: 10000, // opcional: evita errores de timeout
  },
});
