const prisma = require('../utils/prisma');
const { parsePagination, buildListResponse } = require('../utils/pagination');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const VALID_STATUSES = ['ACTIVE', 'AWAY', 'INACTIVE'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/recruiters
 * Query params:
 *   search     - matches recruiter name (case-insensitive)
 *   department - filter by department
 *   status     - filter by ACTIVE / AWAY / INACTIVE
 *   page, limit
 *
 * Scoped to req.user.organizationId. Includes assignedJobs count per PRD 4.5.
 */
const listRecruiters = asyncHandler(async (req, res) => {
  const { search, department, status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  if (status && !VALID_STATUSES.includes(status.toUpperCase())) {
    throw new ApiError(400, 'Invalid status filter', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const where = {
    organizationId: req.user.organizationId,
    ...(status && { status: status.toUpperCase() }),
    ...(department && { department: { equals: department, mode: 'insensitive' } }),
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  };

  const [data, total] = await Promise.all([
    prisma.recruiter.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { assignedJobs: true } } },
    }),
    prisma.recruiter.count({ where }),
  ]);

  const formatted = data.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    jobTitle: r.jobTitle,
    department: r.department,
    location: r.location,
    status: r.status,
    assignedJobsCount: r._count.assignedJobs,
    createdAt: r.createdAt,
  }));

  res.json(buildListResponse({ data: formatted, total, page, limit }));
});

/**
 * POST /api/recruiters
 * Body: { name, email, jobTitle?, department?, location?, status?, assignedJobIds?: string[] }
 * Adds a new recruiter to the caller's organization.
 */
const addRecruiter = asyncHandler(async (req, res) => {
  const { name, email, jobTitle, department, location, status, assignedJobIds } = req.body;

  // ---- validation ----
  const errors = [];
  if (!name || typeof name !== 'string' || !name.trim()) errors.push('name is required');
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) errors.push('a valid email is required');
  if (status && !VALID_STATUSES.includes(String(status).toUpperCase())) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (assignedJobIds && !Array.isArray(assignedJobIds)) {
    errors.push('assignedJobIds must be an array of job ids');
  }
  if (errors.length) {
    throw new ApiError(400, 'Validation failed', errors);
  }

  const recruiter = await prisma.recruiter.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      jobTitle: jobTitle || null,
      department: department || null,
      location: location || null,
      status: status ? status.toUpperCase() : 'ACTIVE',
      organizationId: req.user.organizationId,
      ...(assignedJobIds?.length && {
        assignedJobs: {
          create: assignedJobIds.map((jobId) => ({ jobId })),
        },
      }),
    },
    include: { _count: { select: { assignedJobs: true } } },
  });

  res.status(201).json({
    data: {
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      jobTitle: recruiter.jobTitle,
      department: recruiter.department,
      location: recruiter.location,
      status: recruiter.status,
      assignedJobsCount: recruiter._count.assignedJobs,
      createdAt: recruiter.createdAt,
    },
  });
});

/**
 * GET /api/recruiters/:id
 */
const getRecruiterById = asyncHandler(async (req, res) => {
  const recruiter = await prisma.recruiter.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: { _count: { select: { assignedJobs: true } } },
  });
  if (!recruiter) throw new ApiError(404, 'Not Found', 'Recruiter not found.');

  res.json({
    data: {
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      jobTitle: recruiter.jobTitle,
      department: recruiter.department,
      location: recruiter.location,
      status: recruiter.status,
      assignedJobsCount: recruiter._count.assignedJobs,
      createdAt: recruiter.createdAt,
    },
  });
});

/**
 * PUT /api/recruiters/:id
 * Body: any updatable fields
 */
const updateRecruiter = asyncHandler(async (req, res) => {
  const { name, email, jobTitle, department, location, status } = req.body;

  if (status && !VALID_STATUSES.includes(String(status).toUpperCase())) {
    throw new ApiError(400, 'Invalid status', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (email && !EMAIL_REGEX.test(email)) {
    throw new ApiError(400, 'Validation failed', 'a valid email is required');
  }

  const existing = await prisma.recruiter.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!existing) throw new ApiError(404, 'Not Found', 'Recruiter not found.');

  const updated = await prisma.recruiter.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(department !== undefined && { department }),
      ...(location !== undefined && { location }),
      ...(status && { status: status.toUpperCase() }),
    },
    include: { _count: { select: { assignedJobs: true } } },
  });

  res.json({
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      jobTitle: updated.jobTitle,
      department: updated.department,
      location: updated.location,
      status: updated.status,
      assignedJobsCount: updated._count.assignedJobs,
      createdAt: updated.createdAt,
    },
  });
});

/**
 * DELETE /api/recruiters/:id
 */
const deleteRecruiter = asyncHandler(async (req, res) => {
  const existing = await prisma.recruiter.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!existing) throw new ApiError(404, 'Not Found', 'Recruiter not found.');

  await prisma.recruiter.delete({ where: { id: req.params.id } });
  res.json({ message: 'Recruiter deleted successfully.' });
});

module.exports = { listRecruiters, addRecruiter, getRecruiterById, updateRecruiter, deleteRecruiter, VALID_STATUSES };
