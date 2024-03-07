const path = require('node:path');
const jsonServer = require("json-server");
const router = jsonServer.router(path.resolve(__dirname, "../database/db.json"));

module.exports = router;
