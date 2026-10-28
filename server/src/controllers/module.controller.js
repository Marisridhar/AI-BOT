import moduleService from '../services/module.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createModule = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const module = await moduleService.createModule(courseId, req.body);
  res.status(201).json({
    success: true,
    data: module
  });
});

export const listModules = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const modules = await moduleService.listModules(courseId);
  res.status(200).json({
    success: true,
    data: modules
  });
});

export const getModuleById = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const module = await moduleService.getModuleById(moduleId);
  res.status(200).json({
    success: true,
    data: module
  });
});

export const updateModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const module = await moduleService.updateModule(moduleId, req.body);
  res.status(200).json({
    success: true,
    data: module
  });
});

export const deleteModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const result = await moduleService.deleteModule(moduleId);
  res.status(200).json({
    success: true,
    data: result
  });
});

export const reorderModules = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { orderedIds } = req.body;
  const modules = await moduleService.reorderModules(courseId, orderedIds);
  res.status(200).json({
    success: true,
    data: modules
  });
});

