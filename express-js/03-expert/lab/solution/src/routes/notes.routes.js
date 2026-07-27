import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validateBody.js';
import { rejectDangerousHtml } from '../middleware/xssGuard.js';
import * as notesService from '../services/notes.service.js';

export const notesRouter = Router();

const noteSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

notesRouter.post(
  '/',
  validateBody(noteSchema),
  rejectDangerousHtml('body'),
  asyncHandler(async (req, res) => {
    const note = await notesService.createNote(req.body);
    res.status(201).json({ data: note });
  }),
);

notesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await notesService.listNotes() });
  }),
);
