const oracledb = require('oracledb');
const dbConfig = require('./dbconfig');

// Default outFormat to OBJECT for all queries
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let poolInitialized = false;

/**
 * Initialize Oracle Connection Pool
 */
async function initPool() {
    if (poolInitialized) return;
    try {
        await oracledb.createPool({
            ...dbConfig,
            poolMin: 2,
            poolMax: 20,
            poolIncrement: 2,
            poolTimeout: 60
        });
        poolInitialized = true;
        console.log('Oracle Connection Pool initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize Oracle Connection Pool:', err);
        throw err;
    }
}

/**
 * Close Oracle Connection Pool on application termination
 */
async function closePool() {
    if (!poolInitialized) return;
    try {
        await oracledb.getPool().close(10);
        poolInitialized = false;
        console.log('Oracle Connection Pool closed.');
    } catch (err) {
        console.error('Error closing Oracle Connection Pool:', err);
    }
}

/**
 * Helper to safely get a connection from the pool (or direct connection if pool not initialized)
 */
async function getConnection() {
    if (poolInitialized) {
        return await oracledb.getConnection();
    }
    return await oracledb.getConnection(dbConfig);
}

/**
 * Executes a single query with automatic connection management and leak protection.
 * @param {string} sql - SQL query string
 * @param {object|array} binds - Bind parameters
 * @param {object} options - Execution options
 * @returns {Promise<object>} - Oracle execution result object
 */
async function execute(sql, binds = {}, options = {}) {
    let connection;
    try {
        connection = await getConnection();
        const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT, ...options };
        return await connection.execute(sql, binds, opts);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection in execute():', err);
            }
        }
    }
}

/**
 * Executes a function within a transactional boundary with automatic commit, rollback, and cleanup.
 * @param {function(connection): Promise<any>} callback - Transaction logic callback
 * @returns {Promise<any>} - Result returned by the callback
 */
async function withTransaction(callback) {
    let connection;
    try {
        connection = await getConnection();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error rolling back transaction:', rollbackErr);
            }
        }
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection in withTransaction():', err);
            }
        }
    }
}

/**
 * Safely borrows a connection from the pool and guarantees cleanup in finally.
 * @param {function(connection): Promise<any>} callback
 * @returns {Promise<any>}
 */
async function withConnection(callback) {
    let connection;
    try {
        connection = await getConnection();
        return await callback(connection);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection in withConnection():', err);
            }
        }
    }
}

module.exports = {
    initPool,
    closePool,
    getConnection,
    execute,
    withTransaction,
    withConnection,
    oracledb
};
