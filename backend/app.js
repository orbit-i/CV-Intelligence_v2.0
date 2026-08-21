const express = require('express');
const candidatesRouter = require('./routes/candidates');
const recruitersRouter = require('./routes/recruiters');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// ----------------------------------------------------------------------------
// TODO (integration): mount Abu bakar's JWT verify middleware here, before
// these routers, so req.user is populated for every request below:
//   const { verifyJwt } = require('./middleware/verifyJwt'); // his module
//   app.use('/api', verifyJwt);
// Without it, requireAuth() in these routes will correctly reject with 401.
// ----------------------------------------------------------------------------

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/candidates', candidatesRouter);
app.use('/api/recruiters', recruitersRouter);

app.use((req, res) => res.status(404).json({ error: 'Not Found', message: 'Route not found.' }));
app.use(errorHandler);

module.exports = app;
