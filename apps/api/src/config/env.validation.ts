import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3001),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),

  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .required()
    .messages({ 'string.pattern.base': 'DATABASE_URL must be a postgres:// URL' }),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  // Phase 2+ integrations: present in .env.example, optional until used.
  DARAJA_ENVIRONMENT: Joi.string().valid('sandbox', 'production').optional(),
  DARAJA_CONSUMER_KEY: Joi.string().allow('').optional(),
  DARAJA_CONSUMER_SECRET: Joi.string().allow('').optional(),
  DARAJA_SHORTCODE: Joi.string().allow('').optional(),
  DARAJA_PASSKEY: Joi.string().allow('').optional(),
  DARAJA_CALLBACK_URL: Joi.string().allow('').optional(),
  AT_USERNAME: Joi.string().allow('').optional(),
  AT_API_KEY: Joi.string().allow('').optional(),
  AT_SENDER_ID: Joi.string().allow('').optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),
});
