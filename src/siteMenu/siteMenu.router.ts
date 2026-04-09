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
siteMenuRouter.get('/getMenu/:id', getMenuDetail);
siteMenuRouter.post('/createMenu', createMenu);
siteMenuRouter.put('/updateMenu/:id', updateMenu);
siteMenuRouter.delete('/deleteMenu/:id', deleteMenu);

export default siteMenuRouter;
