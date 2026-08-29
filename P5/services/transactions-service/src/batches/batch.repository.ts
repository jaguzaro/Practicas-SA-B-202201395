import type { Batch, BatchDetail, NewBatch } from "./batch.types.js";

export interface BatchRepository {
  create(batch: NewBatch): Promise<Batch>;
  findAll(): Promise<Batch[]>;
  findById(id: number): Promise<BatchDetail | null>;
}
