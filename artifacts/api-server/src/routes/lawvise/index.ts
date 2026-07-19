import { Router } from "express";
import analyzeRouter from "./analyze";
import chatRouter from "./chat";
import draftRouter from "./draft";
import calculatorsRouter from "./calculators";
import documentsRouter from "./documents";
import casesRouter from "./cases";

const router: Router = Router();

router.use(analyzeRouter);
router.use(chatRouter);
router.use(draftRouter);
router.use(calculatorsRouter);
router.use(documentsRouter);
router.use(casesRouter);

export default router;
