import { Router } from "express";
import analyzeRouter from "./analyze";
import chatRouter from "./chat";
import draftRouter from "./draft";
import calculatorsRouter from "./calculators";
import documentsRouter from "./documents";
import casesRouter from "./cases";
import uploadRouter from "./upload";
import researchRouter from "./research";
import foldersRouter from "./folders";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";

const router: Router = Router();

router.use(analyzeRouter);
router.use(chatRouter);
router.use(draftRouter);
router.use(calculatorsRouter);
router.use(documentsRouter);
router.use(casesRouter);
router.use(uploadRouter);
router.use(researchRouter);
router.use(foldersRouter);
router.use(settingsRouter);
router.use(notificationsRouter);

export default router;
