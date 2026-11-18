import { ConfigService } from '@nestjs/config';
import { createTypeOrmOptions } from './database.config';

describe('createTypeOrmOptions', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string, defaultValue?: string) => {
        const value = values[key];
        return value !== undefined ? value : defaultValue;
      }),
    }) as unknown as ConfigService;

  it('builds options from individual DB_* variables when DB_HOST is set', () => {
    const config = createConfigService({
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'postgres',
      DB_PASSWORD: 'secret',
      DB_NAME: 'siu_db',
    });

    const options = createTypeOrmOptions(config);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'secret',
      database: 'siu_db',
      autoLoadEntities: true,
      synchronize: false,
      uuidExtension: 'pgcrypto',
      logging: false,
      ssl: false,
    });
  });

  it('falls back to DATABASE_URL when DB_HOST is omitted', () => {
    const config = createConfigService({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/siu_db',
      DB_SSL: 'true',
      DB_LOGGING: 'true',
    });

    const options = createTypeOrmOptions(config);

    expect(options).toMatchObject({
      type: 'postgres',
      url: 'postgresql://user:pass@db.example.com:5432/siu_db',
      synchronize: false,
      logging: false,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('throws when neither DB_HOST nor DATABASE_URL is configured', () => {
    const config = createConfigService({});

    expect(() => createTypeOrmOptions(config)).toThrow(
      'Falta configurar DB_HOST o DATABASE_URL en las variables de entorno.',
    );
  });
});
