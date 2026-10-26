import { Router } from "express";
import healthRouter from "./health";
import lawviseRouter from "./lawvise";
import storageRouter from "./storage";

const router: Router = Router();

router.use(healthRouter);
router.use('/lawvise', lawviseRouter);

router.use(storageRouter);

export default router;
