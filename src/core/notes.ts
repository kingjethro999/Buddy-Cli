import fs from 'fs-extra';
import path from 'path';
import { getBuddyDir } from '../utils/platform.js';

export interface Note {
    id: string;
    text: string;
    tags: string[];
    createdAt: string;
}

function getNotesPath(): string {
    return path.join(getBuddyDir(), 'notes.json');
}

async function loadNotes(): Promise<Note[]> {
    const notesPath = getNotesPath();
    try {
        if (await fs.pathExists(notesPath)) {
            return await fs.readJson(notesPath);
        }
    } catch {
        // Corrupted file
    }
    return [];
}

async function saveNotes(notes: Note[]): Promise<void> {
    await fs.ensureDir(getBuddyDir());
    await fs.writeJson(getNotesPath(), notes, { spaces: 2 });
}

export async function addNote(text: string, tags: string[] = []): Promise<Note> {
    const notes = await loadNotes();
    const note: Note = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text,
        tags,
        createdAt: new Date().toISOString(),
    };
    notes.unshift(note);
    await saveNotes(notes);
    return note;
}

export async function listNotes(filter?: string): Promise<Note[]> {
    const notes = await loadNotes();
    if (!filter) return notes;

    const lowerFilter = filter.toLowerCase();
    return notes.filter(
        n =>
            n.text.toLowerCase().includes(lowerFilter) ||
            n.tags.some(t => t.toLowerCase().includes(lowerFilter))
    );
}

export async function deleteNote(id: string): Promise<boolean> {
    const notes = await loadNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    notes.splice(index, 1);
    await saveNotes(notes);
    return true;
}

export async function clearNotes(): Promise<void> {
    await saveNotes([]);
}
