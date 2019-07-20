import 'dotenv/config';

import express from 'express';
import { resolve } from 'path';
import 'express-async-errors';

import routes from './routes';

import './database';

class App {
  constructor() {
    this.server = express();

    this.middlewares();
    this.routes();

    this.exceptionHandler();
  }

  middlewares() {
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(resolve(__dirname, '..', 'temp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
  }

  exceptionHandler() {
    this.server.use((err, req, res, next) => {
      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App().server;
