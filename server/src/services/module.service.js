import mongoose from 'mongoose';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Assignment from '../models/Assignment.js';
import { AppError } from '../utils/AppError.js';

export class ModuleService {
  async createModule(courseId, data) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new AppError('Invalid course ID', 400, 'INVALID_ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const { title, description, learningObjectives, prerequisiteModuleIds, required, deadline, settings } = data;
    if (!title || !title.trim()) {
      throw new AppError('Module title is required', 400, 'VALIDATION_ERROR');
    }

    // Determine order
    const lastModule = await Module.findOne({ courseId }).sort({ order: -1 });
    const order = data.order !== undefined ? Number(data.order) : (lastModule ? lastModule.order + 1 : 1);

    const module = new Module({
      courseId,
      title: title.trim(),
      description: description ? description.trim() : '',
      order,
      learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [],
      prerequisiteModuleIds: Array.isArray(prerequisiteModuleIds) ? prerequisiteModuleIds : [],
      required: required !== undefined ? Boolean(required) : true,
      deadline: deadline ? new Date(deadline) : null,
      status: 'draft',
      settings: settings || { requireUnderstandingChecks: true, requireAssignmentApproval: true }
    });

    await module.save();
    return module;
  }

  async listModules(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new AppError('Invalid course ID', 400, 'INVALID_ID');
    }
    return Module.find({ courseId }).sort({ order: 1 });
  }

  async getModuleById(moduleId) {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw new AppError('Invalid module ID', 400, 'INVALID_ID');
    }
    const module = await Module.findById(moduleId);
    if (!module) {
      throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
    }
    return module;
  }

  async updateModule(moduleId, updates) {
    const module = await this.getModuleById(moduleId);

    if (updates.prerequisiteModuleIds) {
      // Prevent circular prerequisites
      await this.checkCircularPrerequisites(moduleId, updates.prerequisiteModuleIds);
      module.prerequisiteModuleIds = updates.prerequisiteModuleIds;
    }

    const allowed = ['title', 'description', 'order', 'learningObjectives', 'required', 'deadline', 'status', 'settings'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        module[key] = updates[key];
      }
    }

    await module.save();
    return module;
  }

  async deleteModule(moduleId) {
    const module = await this.getModuleById(moduleId);

    // Check if other modules depend on this one as prerequisite
    const dependents = await Module.find({ prerequisiteModuleIds: module._id });
    if (dependents.length > 0) {
      throw new AppError(
        `Cannot delete module: it is a prerequisite for ${dependents.map((d) => `"${d.title}"`).join(', ')}`,
        400,
        'MODULE_HAS_DEPENDENTS'
      );
    }

    await Lesson.deleteMany({ moduleId: module._id });
    await Assignment.deleteMany({ moduleId: module._id });
    await Module.deleteOne({ _id: module._id });

    return { message: 'Module deleted successfully' };
  }

  async reorderModules(courseId, orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new AppError('orderedIds array is required', 400, 'VALIDATION_ERROR');
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, courseId },
        update: { $set: { order: index + 1 } }
      }
    }));

    await Module.bulkWrite(bulkOps);
    return this.listModules(courseId);
  }

  async checkCircularPrerequisites(targetModuleId, newPrereqIds) {
    const visited = new Set();
    const queue = [...newPrereqIds.map((id) => id.toString())];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (currentId === targetModuleId.toString()) {
        throw new AppError('Circular prerequisite dependency detected', 400, 'CIRCULAR_PREREQUISITE');
      }
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const mod = await Module.findById(currentId);
        if (mod && Array.isArray(mod.prerequisiteModuleIds)) {
          for (const p of mod.prerequisiteModuleIds) {
            queue.push(p.toString());
          }
        }
      }
    }
  }
}

export const moduleService = new ModuleService();
export default moduleService;

