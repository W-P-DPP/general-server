

import type { Request, Response } from "express";
import siteMenu from "../siteMenu.ts";
import {HttpStatus} from "../../utils/constant/HttpStatus.ts";
const getMenu = async(req:Request,res:Response)=>{
    res.sendSuccess({data:siteMenu,code:HttpStatus.SUCCESS})
}


export {    getMenu
}