import { RequestModel } from '../models/Request.js';

export async function generateRequestId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const count = await RequestModel.countDocuments();
  return `${year}${(12000000 + count + 1).toString().slice(1)}`;
}
