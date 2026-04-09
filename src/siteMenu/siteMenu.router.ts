import express, { type Router } from 'express';
import {
  createMenu,
  deleteMenu,
  getMenu,
  getMenuDetail,
  updateMenu,
} from './siteMenu.controller.ts';

const siteMenuRouter: Router = express.Router();

siteMenuRouter.get('/getMenu', getMenu);
siteMenuRouter.get('/site-menu', getMenu);
siteMenuRouter.get('/site-menu/:id', getMenuDetail);
siteMenuRouter.post('/site-menu', createMenu);
siteMenuRouter.put('/site-menu/:id', updateMenu);
siteMenuRouter.delete('/site-menu/:id', deleteMenu);

export default siteMenuRouter;
