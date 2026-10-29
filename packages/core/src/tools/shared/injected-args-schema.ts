import { z } from 'zod';

export const binaryArgShape = { binary: z.boolean().optional() };

export const forVisionArgShape = { forVision: z.boolean().optional() };

export const budgetArgShape = { budget: z.boolean().optional() };
