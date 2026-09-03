module.exports = {
    user: process.env.DB_USER || "mukdho",
    password: process.env.DB_PASSWORD || "1234",
    connectString: process.env.DB_CONNECT_STRING || "localhost:1539/orcl",
};