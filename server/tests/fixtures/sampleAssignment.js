export const sampleAssignmentData = {
  title: 'Build a Secure REST API for User Notes',
  description: 'Create an Express.js API with endpoints to add and retrieve user notes securely.',
  scenarioText: 'You are working at FinTech Corp. Build a microservice that stores notes with validation and secure headers.',
  requirements: [
    'Create POST /api/notes to accept a note with title and body',
    'Create GET /api/notes to list all notes',
    'Return 400 Bad Request if title or body is missing'
  ],
  expectedOutcome: 'A modular Express router with input validation and appropriate HTTP status codes.',
  answerKey: `
import express from 'express';
const router = express.Router();
const notes = [];

router.post('/api/notes', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }
  const note = { id: Date.now(), title, body };
  notes.push(note);
  res.status(201).json(note);
});

router.get('/api/notes', (req, res) => {
  res.json(notes);
});

export default router;
  `.trim(),
  rubric: [
    {
      name: 'Functional correctness',
      description: 'Endpoints are implemented according to the requirements',
      weight: 40
    },
    {
      name: 'Input validation',
      description: 'Checks for missing fields and returns 400',
      weight: 30
    },
    {
      name: 'Code structure & best practices',
      description: 'Clean modular code and consistent response formatting',
      weight: 30
    }
  ],
  status: 'published'
};

export const sampleNextAssignmentData = {
  title: 'Extend Notes API with Search and Filtering',
  description: 'Add query parameter filtering to the notes list endpoint.',
  scenarioText: 'FinTech Corp now needs search capability by note title.',
  requirements: [
    'Update GET /api/notes?q=keyword to filter notes by title',
    'Return empty array if no notes match'
  ],
  expectedOutcome: 'Case-insensitive search filter in GET /api/notes endpoint.',
  answerKey: 'notes.filter(n => n.title.toLowerCase().includes(q.toLowerCase()));',
  rubric: [
    {
      name: 'Query filtering implementation',
      description: 'Accurate substring filter matching',
      weight: 60
    },
    {
      name: 'Edge cases',
      description: 'Handles empty query and special characters gracefully',
      weight: 40
    }
  ],
  status: 'published'
};

