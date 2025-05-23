const express = require('express');
const app = express();
const uploadRoutes = require('./routes/upload');

app.use('/upload', uploadRoutes);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
