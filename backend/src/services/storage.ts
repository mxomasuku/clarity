import * as fs from 'fs';
import * as path from 'path';

class LocalFileStorage {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, caseId: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${caseId}_${Date.now()}${fileExtension}`;
    const targetPath = path.join(this.uploadDir, fileName);

    // Write file to local storage
    fs.writeFileSync(targetPath, file.buffer);
    
    // Return relative URL that our Express server can serve
    return `/uploads/${fileName}`;
  }
}

const localStore = new LocalFileStorage();

export const storageService = {
  async saveFile(file: Express.Multer.File, caseId: string): Promise<string> {
    // If we have GCS configs, we would instantiate and run GCS upload here.
    // Defaulting to local mock file store.
    return localStore.uploadFile(file, caseId);
  }
};
