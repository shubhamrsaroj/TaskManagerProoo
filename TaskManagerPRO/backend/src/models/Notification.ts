import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  message: string;
  type: 'task_assigned' | 'task_updated' | 'task_completed' | 'system' | 'achievement' | 'points_earned';
  entityId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['task_assigned', 'task_updated', 'task_completed', 'system', 'achievement', 'points_earned'],
      default: 'system',
    },
    entityId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries by user
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 