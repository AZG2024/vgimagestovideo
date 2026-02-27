import { PipeTransform } from '@nestjs/common';
export declare class FileValidationPipe implements PipeTransform {
    transform(file: Express.Multer.File): Express.Multer.File;
}
