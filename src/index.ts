
import express, { type Router } from 'express';
import siteMenuRouter from './siteMenu/siteMenu.router.ts';

const router: Router = express.Router();

router.use(siteMenuRouter);

export default router;
