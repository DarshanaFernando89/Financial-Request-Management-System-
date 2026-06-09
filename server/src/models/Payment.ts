import mongoose, { Schema } from 'mongoose';

const paymentSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    amount: { type: Number, required: true },
    paidAt: { type: Date, required: true },
    referenceNo: { type: String, required: true },
    remarks: String,
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

paymentSchema.index({ paidAt: -1 });

export const PaymentModel = mongoose.model('Payment', paymentSchema);
