import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';
import { buildSwaggerConfig } from '../src/config/swagger.config';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const target = join(process.cwd(), 'openapi.json');
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();
  console.log(`OpenAPI written to ${target}`);
}

exportOpenApi().catch((error) => {
  console.error('Failed to export OpenAPI:', error);
  process.exitCode = 1;
});
