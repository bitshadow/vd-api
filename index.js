const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// load environment config
require("dotenv").config();

const objectRouter = require('./routes/object');
const indexRouter = require('./routes/index');
const app = express();

// connect with database
const connectDatabase = require("./db");
connectDatabase();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/object', objectRouter);
app.use('/', indexRouter);

module.exports = app;
