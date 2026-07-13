const express = require('express');
const app = require('./src/backend/server');

// Keep an explicit Express reference so Vercel detects this as a Node backend.
void express;

module.exports = app;
