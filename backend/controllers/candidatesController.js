const prisma = require('../utils/prisma');
const { parsePagination, buildListResponse } = require('../utils/pagination');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const VALID_STAGES = [
  'APPLIED',
  'SCREENING',
  'ASSESSMENT',
  'SHORTLISTED',
  'IN_INTERVIEW',
  'HIRED',
  'REJECTED',
];

/**
 * GET /api/candidates
 * Query params:
 *   search    - matches candidate name (case-insensitive)
 *   jobId     - filter by job applied for
 *   stage     - filter by hiring stage (see VALID_STAGES)
 *   department- filter by department
 *   page, limit - pagination (defaults: page=1, limit=10, max limit=100)
 *
 * Scoped to req.user.organizationId so one org never sees another org's data.
 */
const listCandidates = asyncHandler(async (req, res) => {
  const { search, jobId, stage, department } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  if (stage && !VALID_STAGES.includes(stage.toUpperCase())) {
    throw new ApiError(400, 'Invalid stage filter', `stage must be one of: ${VALID_STAGES.join(', ')}`);
  }

  const where = {
    organizationId: req.user.organizationId,
    ...(jobId && { jobId }),
    ...(stage && { stage: stage.toUpperCase() }),
    ...(department && { department: { equals: department, mode: 'insensitive' } }),
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  };

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);

  const formatted = data.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    jobTitle: c.job?.title || null,
    jobId: c.jobId,
    department: c.department,
    location: c.location,
    stage: c.stage,
    createdAt: c.createdAt,
  }));

  res.json(buildListResponse({ data: formatted, total, page, limit }));
});

/**
 * GET /api/candidates/:id
 * Single candidate detail — handy alongside the list endpoint for a detail view.
 */
const getCandidateById = asyncHandler(async (req, res) => {
  const candidate = await prisma.candidate.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: { job: { select: { id: true, title: true } } },
  });

  if (!candidate) {
    throw new ApiError(404, 'Not Found', 'Candidate not found.');
  }

  res.json({ data: candidate });
});
/**
 * POST /api/candidates
 * Body: { name, email?, jobId?, department?, location?, stage? }
 * Adds a new candidate to the caller's organization.
 */
const createCandidate = asyncHandler(async (req, res) => {
  const { name, email, jobId, department, location, stage } = req.body;

  // ---- validation ----
  const errors = [];
  if (!name || typeof name !== 'string' || !name.trim()) errors.push('name is required');
  if (stage && !VALID_STAGES.includes(String(stage).toUpperCase())) {
    errors.push(`stage must be one of: ${VALID_STAGES.join(', ')}`);
  }
  if (errors.length) {
    throw new ApiError(400, 'Validation failed', errors);
  }

  const candidate = await prisma.candidate.create({
    data: {
      name: name.trim(),
      email: email || null,
      jobId: jobId || null,
      department: department || null,
      location: location || null,
      stage: stage ? stage.toUpperCase() : 'APPLIED',
      organizationId: req.user.organizationId,
    },
    include: {
      job: { select: { id: true, title: true } },
    },
  });

  res.status(201).json({
    data: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      jobTitle: candidate.job?.title || null,
      jobId: candidate.jobId,
      department: candidate.department,
      location: candidate.location,
      stage: candidate.stage,
      createdAt: candidate.createdAt,
    },
  });
});

/**
 * PUT /api/candidates/:id
 * Body: any updatable fields
 */
const updateCandidate = asyncHandler(async (req, res) => {
  const { name, email, jobId, department, location, stage } = req.body;

  if (stage && !VALID_STAGES.includes(String(stage).toUpperCase())) {
    throw new ApiError(400, 'Invalid stage', `stage must be one of: ${VALID_STAGES.join(', ')}`);
  }

  const existing = await prisma.candidate.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!existing) throw new ApiError(404, 'Not Found', 'Candidate not found.');

  const updated = await prisma.candidate.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name: name.trim() }),
      ...(email !== undefined && { email }),
      ...(jobId !== undefined && { jobId }),
      ...(department !== undefined && { department }),
      ...(location !== undefined && { location }),
      ...(stage && { stage: stage.toUpperCase() }),
    },
    include: {
      job: { select: { id: true, title: true } },
    },
  });

  res.json({
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      jobTitle: updated.job?.title || null,
      jobId: updated.jobId,
      department: updated.department,
      location: updated.location,
      stage: updated.stage,
      createdAt: updated.createdAt,
    },
  });
});

/**
 * DELETE /api/candidates/:id
 */
const deleteCandidate = asyncHandler(async (req, res) => {
  const existing = await prisma.candidate.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!existing) throw new ApiError(404, 'Not Found', 'Candidate not found.');

  await prisma.candidate.delete({ where: { id: req.params.id } });
  res.json({ message: 'Candidate deleted successfully.' });
});
module.exports = { listCandidates, getCandidateById, createCandidate, updateCandidate, deleteCandidate, VALID_STAGES };
