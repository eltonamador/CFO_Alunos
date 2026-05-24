import type { Document, DocumentStatus, DocumentType } from "../entities/Document";

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  findByStudentId(studentId: string): Promise<Document[]>;
  findPendingValidation(filter?: { docType?: DocumentType }): Promise<Document[]>;
  countByStatus(studentId: string): Promise<Record<DocumentStatus, number>>;
  save(doc: Document): Promise<void>;
  create(doc: Document): Promise<void>;
}
