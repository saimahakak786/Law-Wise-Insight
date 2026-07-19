import { Router } from "express";
import healthRouter from "./health";
import lawviseRouter from "./lawvise";

const router: Router = Router();

router.use(healthRouter);
router.use(lawviseRouter);

export default router;
