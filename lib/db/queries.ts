// lib/db/queries.ts
// Database query helpers — uses Prisma Client.
// Each function maps to a specific DB operation.
// Uses explicit module branching (not dynamic) for full TypeScript type safety.

import prisma from '@/lib/prisma';
import type {
  pc_companies,
  pc_upload_jobs,
  pc_generation_jobs,
  pc_output_files,
  ra_companies,
  ra_upload_jobs,
  ra_generation_jobs,
  ra_output_files,
  user_profiles,
} from '@/lib/generated/prisma/client';

// ─── Types ───────────────────────────────────────────────────

export type Company = pc_companies | ra_companies;
export type UploadJob = pc_upload_jobs | ra_upload_jobs;
export type GenerationJob = pc_generation_jobs | ra_generation_jobs;
export type OutputFile = pc_output_files | ra_output_files;
export type UserProfile = user_profiles;

// ─── Companies ───────────────────────────────────────────────

/** Get all companies for a module ('pc' or 'ra') */
export async function getCompanies(module: string) {
  if (module === 'ra') {
    return prisma.ra_companies.findMany({ orderBy: { name: 'asc' } });
  }
  return prisma.pc_companies.findMany({ orderBy: { name: 'asc' } });
}

/** Create a new company. Returns the created company. */
export async function createCompany(
  name: string,
  module: string,
  createdBy?: string,
) {
  if (module === 'ra') {
    return prisma.ra_companies.upsert({
      where: { name },
      create: { name, created_by: createdBy || null },
      update: {},
    });
  }
  return prisma.pc_companies.upsert({
    where: { name },
    create: { name, created_by: createdBy || null },
    update: {},
  });
}

/** Get a single company by ID */
export async function getCompanyById(id: string, module: string = 'pc') {
  if (module === 'ra') {
    return prisma.ra_companies.findUnique({ where: { id } });
  }
  return prisma.pc_companies.findUnique({ where: { id } });
}

/** Get a company by name and module */
export async function getCompanyByName(name: string, module: string) {
  if (module === 'ra') {
    return prisma.ra_companies.findUnique({ where: { name } });
  }
  return prisma.pc_companies.findUnique({ where: { name } });
}

// ─── Upload Jobs ─────────────────────────────────────────────

/** Get upload jobs for a company (most recent first) */
export async function getUploadJobs(companyId: string, module: string = 'pc') {
  if (module === 'ra') {
    return prisma.ra_upload_jobs.findMany({
      where: { company_id: companyId },
      include: { companies: { select: { name: true } } },
      orderBy: { started_at: 'desc' },
    });
  }
  return prisma.pc_upload_jobs.findMany({
    where: { company_id: companyId },
    include: { companies: { select: { name: true } } },
    orderBy: { started_at: 'desc' },
  });
}

/** Get the latest upload job for a company */
export async function getLatestUploadJob(companyId: string, module: string = 'pc') {
  if (module === 'ra') {
    return prisma.ra_upload_jobs.findFirst({
      where: { company_id: companyId },
      include: { companies: { select: { name: true } } },
      orderBy: { started_at: 'desc' },
    });
  }
  return prisma.pc_upload_jobs.findFirst({
    where: { company_id: companyId },
    include: { companies: { select: { name: true } } },
    orderBy: { started_at: 'desc' },
  });
}

/** Create a new upload job */
export async function createUploadJob(
  companyId: string,
  fileNames: string[],
  fileCategories: Record<string, string[]>,
  uploadedBy?: string,
  module: string = 'pc',
) {
  const data = {
    company_id: companyId,
    status: 'uploading' as const,
    file_names: fileNames,
    file_categories: fileCategories,
    uploaded_by: uploadedBy || null,
  };

  if (module === 'ra') {
    return prisma.ra_upload_jobs.create({ data });
  }
  return prisma.pc_upload_jobs.create({ data });
}

/** Update upload job status */
export async function updateUploadJob(
  jobId: string,
  updates: { status?: string; progress?: number; error_message?: string; gcs_paths?: Record<string, string> },
  module: string = 'pc',
) {
  const data: Record<string, unknown> = {};

  if (updates.status !== undefined) data.status = updates.status;
  if (updates.progress !== undefined) data.progress = updates.progress;
  if (updates.error_message !== undefined) data.error_message = updates.error_message;
  if (updates.gcs_paths !== undefined) data.gcs_paths = updates.gcs_paths;
  if (updates.status === 'completed' || updates.status === 'failed') {
    data.completed_at = new Date();
  }

  if (Object.keys(data).length === 0) return null;

  if (module === 'ra') {
    return prisma.ra_upload_jobs.update({ where: { id: jobId }, data });
  }
  return prisma.pc_upload_jobs.update({ where: { id: jobId }, data });
}

// ─── Generation Jobs ─────────────────────────────────────────

/** Get all generation jobs for a company */
export async function getGenerationJobs(companyId: string, module: string = 'pc') {
  if (module === 'ra') {
    return prisma.ra_generation_jobs.findMany({
      where: { company_id: companyId },
      include: { companies: { select: { name: true } } },
      orderBy: { started_at: 'desc' },
    });
  }
  return prisma.pc_generation_jobs.findMany({
    where: { company_id: companyId },
    include: { companies: { select: { name: true } } },
    orderBy: { started_at: 'desc' },
  });
}

/** Create a new PC generation job (with section) */
export async function createGenerationJob(
  companyId: string,
  sectionName: string,
  subsidiaryName: string | null,
  backendJobId: string,
  createdBy?: string,
) {
  return prisma.pc_generation_jobs.create({
    data: {
      company_id: companyId,
      section_name: sectionName,
      subsidiary_name: subsidiaryName,
      backend_job_id: backendJobId,
      status: 'generating',
      created_by: createdBy || null,
    },
  });
}

/** Create a new RA generation job (no section) */
export async function createRaGenerationJob(
  companyId: string,
  backendJobId: string,
  createdBy?: string,
) {
  return prisma.ra_generation_jobs.create({
    data: {
      company_id: companyId,
      backend_job_id: backendJobId,
      status: 'generating',
      created_by: createdBy || null,
    },
  });
}

/** Update a generation job */
export async function updateGenerationJob(
  jobId: string,
  updates: { status?: string; progress?: number; output_url?: string; error_message?: string },
  module: string = 'pc',
) {
  const data: Record<string, unknown> = {};

  if (updates.status !== undefined) data.status = updates.status;
  if (updates.progress !== undefined) data.progress = updates.progress;
  if (updates.output_url !== undefined) data.output_url = updates.output_url;
  if (updates.error_message !== undefined) data.error_message = updates.error_message;
  if (updates.status === 'completed' || updates.status === 'failed') {
    data.completed_at = new Date();
  }

  if (Object.keys(data).length === 0) return null;

  if (module === 'ra') {
    return prisma.ra_generation_jobs.update({ where: { id: jobId }, data });
  }
  return prisma.pc_generation_jobs.update({ where: { id: jobId }, data });
}

/** Get a generation job by backend job ID */
export async function getGenerationJobByBackendId(backendJobId: string, module: string = 'pc') {
  if (module === 'ra') {
    return prisma.ra_generation_jobs.findFirst({ where: { backend_job_id: backendJobId } });
  }
  return prisma.pc_generation_jobs.findFirst({ where: { backend_job_id: backendJobId } });
}

// ─── Output Files ────────────────────────────────────────────

/** Get all output files for a company */
export async function getOutputFiles(companyId: string, module: string = 'pc') {
  if (module === 'ra') {
    return prisma.ra_output_files.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }
  return prisma.pc_output_files.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  });
}

/** Create a PC output file record */
export async function createPcOutputFile(
  companyId: string,
  data: {
    generation_job_id?: string;
    file_type: string;
    section_name?: string;
    file_name: string;
    gcs_path: string;
    gcs_references_path?: string;
  },
) {
  return prisma.pc_output_files.create({
    data: {
      company_id: companyId,
      generation_job_id: data.generation_job_id || null,
      file_type: data.file_type,
      section_name: data.section_name || null,
      file_name: data.file_name,
      gcs_path: data.gcs_path,
      gcs_references_path: data.gcs_references_path || null,
    },
  });
}

/** Create an RA output file record */
export async function createRaOutputFile(
  companyId: string,
  data: {
    generation_job_id?: string;
    file_type: string;
    file_name: string;
    gcs_path: string;
    gcs_references_path?: string;
  },
) {
  return prisma.ra_output_files.create({
    data: {
      company_id: companyId,
      generation_job_id: data.generation_job_id || null,
      file_type: data.file_type,
      file_name: data.file_name,
      gcs_path: data.gcs_path,
      gcs_references_path: data.gcs_references_path || null,
    },
  });
}

// ─── User Profiles ───────────────────────────────────────────

/** Get or create a user profile */
export async function upsertUserProfile(
  firebaseUid: string,
  displayName: string | null,
  email: string | null,
  role: string = 'member',
  modules: string[] = ['pc'],
) {
  return prisma.user_profiles.upsert({
    where: { firebase_uid: firebaseUid },
    create: {
      firebase_uid: firebaseUid,
      display_name: displayName,
      email,
      role,
      modules,
    },
    update: {
      display_name: displayName || undefined,
      email: email || undefined,
    },
  });
}

/** Get a user profile */
export async function getUserProfile(firebaseUid: string) {
  return prisma.user_profiles.findUnique({
    where: { firebase_uid: firebaseUid },
  });
}
