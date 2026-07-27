import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import { HttpError } from './HttpError.js';

const ALLOWED_STATUS = new Set(['todo', 'doing', 'done']);

/** @type {Map<string, { id: string, title: string, status: string, createdAt: string }>} */
const tasks = new Map();
let seq = 1;

function assertStatus(status) {
  if (!ALLOWED_STATUS.has(status)) {
    throw new HttpError(400, `status must be one of: ${[...ALLOWED_STATUS].join(', ')}`);
  }
}

export const tasksRouter = Router();

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    let list = [...tasks.values()];
    if (status != null) {
      assertStatus(String(status));
      list = list.filter((t) => t.status === status);
    }
    res.json({ data: list, count: list.length });
  }),
);

tasksRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');
    res.json({ data: task });
  }),
);

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const title = req.body?.title;
    const status = req.body?.status ?? 'todo';
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new HttpError(400, 'title is required');
    }
    assertStatus(status);

    const task = {
      id: String(seq++),
      title: title.trim(),
      status,
      createdAt: new Date().toISOString(),
    };
    tasks.set(task.id, task);
    res.status(201).json({ data: task });
  }),
);

tasksRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');

    const { title, status } = req.body ?? {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        throw new HttpError(400, 'title must be a non-empty string');
      }
      task.title = title.trim();
    }
    if (status !== undefined) {
      assertStatus(status);
      task.status = status;
    }
    res.json({ data: task });
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');
    tasks.delete(req.params.id);
    res.json({ data: task });
  }),
);
