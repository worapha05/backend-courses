import { randomUUID } from 'node:crypto';

const notes = [];

export async function createNote({ title, body }) {
  const note = {
    id: randomUUID(),
    title,
    body,
    createdAt: new Date().toISOString(),
  };
  notes.push(note);
  return note;
}

export async function listNotes() {
  return notes;
}
