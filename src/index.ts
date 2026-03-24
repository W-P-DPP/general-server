


import express, { Router } from "express";
import { getMenu } from "./siteMenu/siteMenu.controller.ts";
import agentRouter from './agent/index.ts'


const router:Router = express.Router();
// router.use("/tag",tagRouter)
router.get("/getMenu",getMenu)
router.use("/agent",agentRouter)

export default router;
