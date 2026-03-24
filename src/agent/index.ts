



import express, { Router } from "express";
import { chat, clearChat,getModels } from "./agent.controller.ts";


const router:Router = express.Router();
// router.use("/tag",tagRouter)
router.post("/chat",chat)
router.post("/clear",clearChat)
router.get("/models",getModels)

export default router;
