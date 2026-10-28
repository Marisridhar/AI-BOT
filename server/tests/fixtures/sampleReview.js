export const sampleValidReview = {
  score: 85,
  verdict: 'pass',
  summary: 'Great job! The submission meets the requirements with clean route handlers and validation.',
  criterionScores: [
    {
      criterion: 'Functional correctness',
      score: 36,
      maxScore: 40,
      feedback: 'Endpoints are well-structured and return expected JSON.'
    },
    {
      criterion: 'Input validation',
      score: 25,
      maxScore: 30,
      feedback: 'Handles missing title and body appropriately.'
    },
    {
      criterion: 'Code structure & best practices',
      score: 24,
      maxScore: 30,
      feedback: 'Clear code and proper use of Express router.'
    }
  ],
  strengths: [
    'Good error handling with appropriate HTTP status codes',
    'Follows modern ES module syntax'
  ],
  issues: [
    {
      criterion: 'Input validation',
      severity: 'low',
      evidence: 'req.body.title is checked with if (!title), which allows empty whitespace strings.',
      suggestion: 'Trim the string and ensure title.trim().length > 0.'
    }
  ],
  nextSteps: [
    'Add string trimming on input fields',
    'Add persistent database storage'
  ]
};

export const sampleInvalidReviewMissingScore = {
  verdict: 'pass',
  summary: 'Missing score field'
};

